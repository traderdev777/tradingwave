# ADR-0005: Multi-Tenant Workspace Isolation and Append-Only Audit Logging

## Status
Accepted

## Context
Algorithmic trading SaaS users operate with proprietary strategy intellectual property, risk parameters, and financial account references. Leaking data across tenants or failing to maintain a verifiable record of strategy changes or order intents violates data privacy regulations and security requirements.

## Decision
1. **Workspace-Centric Data Model:**
   - Every resource (`strategies`, `strategy_versions`, `backtest_jobs`, `paper_sessions`, `broker_connections`) possesses a mandatory `workspace_id` foreign key.
   - All backend queries require an explicit `workspace_id` filter bound from the authenticated session context.
2. **Append-Only Audit Log:**
   - All critical mutations and operational events write to the `audit_events` table.
   - `UPDATE` and `DELETE` permissions are revoked on `audit_events` for normal application database roles.
   - Every event captures `actor_user_id`, `workspace_id`, `correlation_id`, `event_type`, and metadata with sensitive tokens stripped.

## Consequences
### Positive
- Robust data privacy and tenant segregation.
- Tamper-evident operational audit trail required for regulatory compliance and dispute resolution.

### Negative / Trade-offs
- Developers must never write raw SQL queries omitting `workspace_id`. This is guarded by automated security integration tests.
