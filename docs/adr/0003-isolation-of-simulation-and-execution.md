# ADR-0003: Physical & Logical Isolation of Simulation and Live Execution Pathways

## Status
Accepted

## Context
A catastrophic failure mode in algorithmic trading platforms occurs when simulation or backtest components inadvertently interact with live broker gateways or transmit simulated orders to live accounts.

Additionally, backtest workers execute untrusted quantitative computations and handle large data volumes, which may cause CPU or memory spikes.

## Decision
1. **Isolated Worker Processes:** Backtest calculations and paper trading simulations execute in isolated worker processes (`services/backtest_worker`, `services/paper_trading`).
2. **Zero Broker Credential Access:** Worker processes are provisioned without broker secrets or broker gateway network egress.
3. **Simulated State Machine:** Paper trading uses a separate virtual order ledger and never instantiates live broker adapters.
4. **Hard Live Execution Barrier:** The live broker execution adapter module (`services/broker_adapters`) is decoupled behind feature flags and database compliance checks.

## Consequences
### Positive
- A software defect, infinite loop, or worker crash during backtesting has zero possibility of transmitting an order to a broker.
- Clear audit separation: Simulated fills are cryptographically and structurally distinct from live broker fills.

### Negative / Trade-offs
- Code duplication between live order state machines and virtual paper state machines must be minimized through shared interfaces while maintaining strict isolation.
