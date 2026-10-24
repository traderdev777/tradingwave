# ADR-0004: SEBI Regulatory Gating & Compliance Enclave

## Status
Accepted

## Context
Under Indian securities regulations (SEBI and stock exchange directives like NSE Circular on Non-NEAT Algo Providers), automated execution of retail orders requires broker empanelment, algorithm registration, and specific risk parameter enforcement.

Offering retail algorithmic trading without certified compliance artifacts exposes both the SaaS company and retail investors to statutory violations and severe financial liability.

## Decision
1. Live execution capability is disabled by default via global configuration (`LIVE_TRADING_ENABLED=false`).
2. A machine-readable compliance gate (`docs/compliance-gates.md`) requires an active, unexpired record in the `deployment_approvals` table before any broker routing endpoint can be invoked.
3. In Phase 0 through Phase 6, the system operates as a **Research and Simulation Platform** (Gate A and Gate B).
4. Live broker order routes return HTTP 403 / 501 with error code `COMPLIANCE_GATE_BLOCKED`.

## Consequences
### Positive
- Ensures full legal and regulatory alignment from Day 1.
- Clear technical audit evidence showing that the platform cannot inadvertently initiate unapproved algorithmic trades.
- Establishes a structured checklist for future enterprise broker partnerships.

### Negative / Trade-offs
- Live retail trading cannot be used as an immediate launch feature; initial commercial focus must remain on strategy research, analytics, and paper trading.
