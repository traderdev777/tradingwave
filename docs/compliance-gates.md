# TradingWave — Indian Regulatory Compliance & Release Gates
**Target Regulatory Regime:** Securities and Exchange Board of India (SEBI), National Stock Exchange of India (NSE), Bombay Stock Exchange (BSE)  
**Document Classification:** Regulatory & Engineering Governance Standard  

---

## 1. Statutory Context & Regulatory Landscape

Algorithmic trading in India is governed by strict regulatory frameworks established by SEBI and implemented via stock exchange circulars. Operating an algorithmic trading SaaS requires a clear understanding of the boundaries between **software provider**, **empanelled algo vendor**, **research analyst**, and **broker execution**.

### Key Regulatory References:
1. **SEBI Circular on Safer Participation of Retail Investors in Algorithmic Trading (February 2025):**  
   *URL:* [SEBI Circular Feb 2025](https://www.sebi.gov.in/legal/circulars/feb-2025/safer-participation-of-retail-investors-in-algorithmic-trading_91614.html)  
   Mandates strict risk controls, order-audit trails, validation of third-party algorithmic platforms, prohibition of unregulated return claims, and broker responsibilities for algorithms deployed by retail clients.
2. **NSE Algorithmic Trading Procedures & Non-NEAT Decision Support Tools:**  
   *URL:* [NSE Platform Services & Algo Trading Procedures](https://www.nseindia.com/static/trade/platform-services-non-neat-decision-support-tools-algorithm-trading)  
   Requires algorithmic software vendors to be empanelled with exchanges or have algorithms tested and approved by partner stockbrokers.
3. **NSE Empanelled Algo Providers & Trading Software Vendors:**  
   *URL:* [NSE Empanelled Vendors](https://www.nseindia.com/static/trade/platform-services-non-neat-empanelled-vendors-of-the-exchange)
4. **SEBI (Research Analysts) Regulations, 2014 (amended November 2025):**  
   *URL:* [SEBI RA Regulations Nov 2025](https://www.sebi.gov.in/legal/regulations/nov-2025/securities-and-exchange-board-of-india-research-analysts-regulations-2014-last-amended-on-november-25-2025-_98248.html)  
   Any platform that provides recommendations, signals, or model portfolios that users pay for could be construed as providing Research Analyst services unless the strategy is transparent and user-directed.

---

## 2. Platform Strategy Classification

| Classification | Definition | Permitted In MVP | Regulatory Requirements |
| :--- | :--- | :--- | :--- |
| **White-Box (User-Authored)** | Full deterministic rule logic authored by the user via Visual Builder or AI Studio. The user sees all conditions, indicators, parameters, and stop-loss logic. | **Yes** (Phase 1–5) | Software tool only. No RA registration required for private self-use. Disclaimers mandatory. |
| **Shared / Community Strategy** | A user-created strategy shared read-only with other workspace members. | **Future** (Phase 9) | Must maintain transparent rule logic. No return guarantees or performance marketing permitted. |
| **Black-Box / Opaque Strategy** | Secret or proprietary trading signals sold to users where the underlying logic is hidden. | **Strictly Prohibited** | Requires SEBI Research Analyst registration and Exchange Algo Registration before commercial distribution. |

---

## 3. The 5-Tier Release Gates

TradingWave enforces progressive, auditable release gates. Each gate requires verifiable compliance artifacts before the next tier is unlocked.

```
+-------------------------------------------------------------------------+
| GATE A: Research & Backtesting SaaS                                     |
| [Status: ENABLED in MVP]                                                |
| - Strategy Creation (Visual + AI Drafts)                                |
| - Licensed Historical Market Data                                       |
| - Deterministic Backtesting & Indian Statutory Costs                    |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| GATE B: Paper Trading & Replay Engine                                   |
| [Status: ENABLED in MVP]                                                |
| - Virtual Order State Machine                                           |
| - Market Data Replay & Telemetry                                        |
| - ZERO Live Order Connectivity                                          |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| GATE C: Broker Sandbox Integration                                      |
| [Status: DORMANT / LAB ONLY]                                            |
| - Broker API integration tests in official Sandbox / UAT environments   |
| - No real capital, no live market routing                               |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| GATE D: Statutory Production Approval                                   |
| [Status: LOCKED]                                                        |
| - Broker empanelment / vendor agreement certified                       |
| - Exchange algorithm registration reference IDs logged                  |
| - Legal review confirming non-IA/RA status of platform model            |
| - Security & penetration testing signed off                             |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| GATE E: Controlled Live Production Release                              |
| [Status: LOCKED]                                                        |
| - Real money broker execution unlocked for approved accounts            |
| - Hard risk limits, pre-trade checks, dual-key kill switch active       |
| - Continuous reconciliation against broker positions                    |
+-------------------------------------------------------------------------+
```

---

## 4. Machine-Readable Compliance Record Schema

Live deployments are guarded by the `deployment_approvals` table. An attempt to activate a live deployment without an approved, non-expired record fails deterministically at the database level:

```sql
CREATE TABLE deployment_approvals (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id),
    strategy_version_id UUID REFERENCES strategy_versions(id),
    broker_code TEXT NOT NULL,                  -- e.g. "ZERODHA", "ANGELONE", "UPSTOX"
    exchange_codes TEXT[] NOT NULL,             -- e.g. ["NSE_EQ", "NSE_FO"]
    approval_reference_id TEXT NOT NULL,        -- Official exchange/broker algo approval ID
    strategy_classification TEXT NOT NULL,      -- "WHITE_BOX_DISCLOSED"
    authorized_by_name TEXT NOT NULL,           -- Compliance officer / legal reviewer
    authorized_by_email TEXT NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,                       -- "PENDING", "APPROVED", "REVOKED", "EXPIRED"
    compliance_artifact_uri TEXT NOT NULL,      -- Storage URI to signed legal/exchange PDF
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Gatekeeper Verification Logic:
```python
def verify_live_deployment_eligibility(
    workspace_id: UUID, strategy_version_id: UUID, broker_code: str, session: Session
) -> bool:
    """Verifies that statutory compliance approvals exist and are currently valid."""
    if not settings.LIVE_TRADING_ENABLED:
        raise ComplianceGateError("Platform-wide live trading is disabled by configuration.")

    approval = (
        session.query(DeploymentApproval)
        .filter(
            DeploymentApproval.workspace_id == workspace_id,
            DeploymentApproval.strategy_version_id == strategy_version_id,
            DeploymentApproval.broker_code == broker_code,
            DeploymentApproval.status == "APPROVED",
            DeploymentApproval.effective_from <= datetime.now(timezone.utc),
            DeploymentApproval.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    if not approval:
        raise ComplianceGateError(
            f"No valid compliance approval found for strategy {strategy_version_id} "
            f"on broker {broker_code}. Live execution blocked."
        )
    return True
```

---

## 5. Required Disclaimers & UI Disclosures

Under Indian market regulations, the platform must display explicit disclaimers:
1. **Hypothetical & Simulated Results Disclaimer:**  
   *"Backtested performance is purely hypothetical and calculated on historical market data. It does not represent actual trading and does not guarantee future results. Market risks apply."*
2. **Non-Advisory Software Disclosure:**  
   *"TradingWave is a quantitative research and trading software technology provider. TradingWave is not a registered Investment Adviser or Research Analyst. The platform does not offer investment advice, stock tips, or guaranteed returns."*
3. **Customer Funds Security:**  
   *"Customer funds and securities reside exclusively with the customer's SEBI-registered stockbroker. TradingWave does not accept, hold, or handle client funds or securities."*
