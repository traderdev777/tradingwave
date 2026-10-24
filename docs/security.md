# TradingWave — Security Architecture & Threat Model
**Classification:** Internal Engineering Standard  
**Compliance Standard:** SEBI Cybersecurity & Cyber Resilience Framework (CSCRF), ISO 27001, Indian DPDP Act 2023  

---

## 1. STRIDE Threat Model for Algorithmic Trading

| Threat Category | Specific System Risk | Mitigation Strategy |
| :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates legitimate user to execute trades or view proprietary strategies. | Strict session management (HTTP-only, Secure, SameSite cookies), short-lived JWTs, optional MFA, and workspace-scoped authorization. |
| **Tampering** | Malicious modification of strategy parameters, backtest logs, or broker orders in flight. | Immutable versioning with SHA-256 hash checks; write-once database constraints; signed webhooks and TLS 1.3 in transit. |
| **Repudiation** | User denies authorizing a strategy execution, paper session, or configuration change. | Append-only `audit_events` ledger recording user UUID, IP, correlation ID, timestamp (UTC), and cryptographic action hash. |
| **Information Disclosure** | Leakage of broker API secrets, historical strategy IP, or other users' backtest results. | Envelope encryption (AES-256-GCM) for secrets; strict tenant isolation in all SQL queries (`WHERE workspace_id = :id`); secret-scrubbing log formatters. |
| **Denial of Service** | Resource exhaustion via runaway backtests, cyclic strategy graphs, or AI query flooding. | Pre-execution AST cycle detection; backtest worker resource quotas (memory/time caps); Redis token-bucket rate limiting. |
| **Elevation of Privilege** | Normal user attempts to activate live trading or access admin console endpoints. | Role-Based Access Control (RBAC); hard feature flags verified in backend business logic; SEBI compliance gate check. |

---

## 2. Multi-Tenant Isolation Architecture

TradingWave implements **Logical Multi-Tenancy** enforced at both application and data access layers.

### 2.1 Workspace Scoping
Every strategy, backtest, paper session, and credential belongs strictly to a `workspace_id`.
```sql
-- Enforcement Rule: Every query involving tenant data MUST bind workspace_id
SELECT * FROM strategies 
WHERE id = :strategy_id 
  AND workspace_id = :current_workspace_id;
```
- Workspace membership is checked via dependency injection (`get_current_workspace_member`) in FastAPI routes.
- Cross-workspace access attempts immediately trigger a `403 Forbidden` and record a high-severity `audit_events` row.

### 2.2 Row-Level Security (RLS) Readiness
For production PostgreSQL deployment, database roles enforce row-level security:
```sql
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation_policy ON strategies
    USING (workspace_id = current_setting('app.current_workspace_id')::UUID);
```

---

## 3. Secret Zero & Broker Credential Protection

### 3.1 Zero Plaintext Storage
1. **Never in Code or Git:** No API keys, database credentials, or broker tokens are committed to source control. Local development uses `.env` (gitignored).
2. **Never in Transactional DB Tables:** The `broker_connections` table stores only a `credential_secret_reference` (e.g., `vault:secret/broker/conn_uuid`), never the raw token or consumer secret.
3. **Envelope Encryption:** Secrets stored at rest are encrypted with AWS KMS / HashiCorp Vault / local AES-256-GCM master key with per-secret DEKs (Data Encryption Keys).

### 3.2 In-Flight Broker Credentials
- Broker tokens are loaded only in volatile memory inside the isolated live execution worker (when activated).
- Workers do not log HTTP headers, request bodies containing auth tokens, or query parameters.
- Standardized logging filters automatically scrub patterns matching `auth*`, `token`, `secret`, `key`, `password`, `pin`, `totp`.

---

## 4. AI Studio Sandboxing & Deterministic Gating

The integration of Large Language Models (LLMs) poses unique security risks (Prompt Injection, Hallucinated Code, Accidental Authority Leak).

```
   +-------------------------------------------------------------+
   |                     USER PROMPT INPUT                       |
   +------------------------------+------------------------------+
                                  |
                                  v
   +-------------------------------------------------------------+
   |             PROMPT SANITIZATION & BOUNDARY RULES            |
   |   - Filter system instructions & prompt injection patterns  |
   |   - Restrict prompt context to strategy drafting only       |
   +------------------------------+------------------------------+
                                  |
                                  v
   +-------------------------------------------------------------+
   |                    SERVER-SIDE LLM CALL                     |
   |   - Provider-independent gateway (OpenAI / Claude / etc.)   |
   |   - Enforce JSON-schema constrained decoding                |
   +------------------------------+------------------------------+
                                  |
                                  v
   +-------------------------------------------------------------+
   |             UNTRUSTED STRATEGY DRAFT (JSON)                 |
   +------------------------------+------------------------------+
                                  |
                                  v
   +-------------------------------------------------------------+
   |         DETERMINISTIC COMPILER & STATIC VALIDATOR           |
   |   - Schema validation (Pydantic v2)                         |
   |   - Unknown indicator check & parameter boundary check      |
   |   - Directed Acyclic Graph (DAG) cycle rejection            |
   |   - Required risk limits enforcement                        |
   +------------------------------+------------------------------+
                                  |
                   +--------------+--------------+
                   |                             |
             [Passes Checks]               [Fails Checks]
                   v                             v
   +------------------------------+   +--------------------------+
   |   PREVIEW FOR USER APPROVAL  |   | RETURN ACTIONABLE ERRORS |
   +------------------------------+   +--------------------------+
```

### Invariants:
- The AI service has **no access** to the database connection pool, broker credentials, or network routing.
- The AI is **never allowed** to output arbitrary executable Python/JavaScript code that is evaluated (`eval()`, `exec()` are strictly banned).
- AI drafts require explicit human review and publication before becoming a runnable version.

---

## 5. Emergency Kill Switch Architecture

The platform incorporates a fail-safe **Dual-Key Emergency Kill Switch**:

1. **System-Wide Kill Switch (`EMERGENCY_KILL_SWITCH_ACTIVE=true`):**
   - Implemented as an atomic Redis flag and database latch.
   - When tripped, all running paper sessions and broker worker queues immediately halt order generation.
2. **Workspace-Level Emergency Stop:**
   - Any workspace owner or admin can trigger `POST /api/v1/workspaces/{id}/emergency-stop`.
   - Halts all active paper trading sessions for that workspace.
   - Future live execution follows the tested broker cancellation policy (stops new orders, manages existing positions according to pre-configured policy).

---

## 6. Audit Trail & Integrity

Audit records are stored in the immutable `audit_events` table:
```sql
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL,
    actor_user_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    correlation_id TEXT NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- Audit events are append-only. Application database users are granted `INSERT` and `SELECT` only; `UPDATE` and `DELETE` privileges are explicitly revoked.
- Every state transition (Strategy Published, Backtest Queued, Paper Session Started, Emergency Stop Tripped) produces a synchronous audit log entry.

---

## 7. Data Privacy & Indian DPDP Act 2023 Compliance

- **Data Minimization:** Only operational trading data, user identity, and audit records are captured.
- **Right to Erasure:** User account deletion triggers soft-deletion and scrubbing of personal identifiers, while maintaining anonymized regulatory audit trails as mandated by SEBI record-retention rules (minimum 5 years for trading-related records).
- **Data Residency:** All databases, backups, and compute instances reside within Indian data center regions (e.g., AWS `ap-south-1` Mumbai / Hyderabad).
