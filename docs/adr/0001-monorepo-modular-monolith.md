# ADR-0001: Monorepo with Modular Monolith Architecture

## Status
Accepted

## Context
Building an algorithmic trading SaaS for the Indian market requires coordination between:
- A modern web client (Next.js/React) for visual graph editing and analytics.
- A fast, type-safe API gateway (FastAPI) handling authorization and business logic.
- A high-performance quantitative computation layer (NumPy/Pandas/Polars) for backtesting and indicator analysis.
- Background worker processes executing intensive simulations without blocking user requests.

Early-stage startups often over-engineer with microservices, resulting in distributed tracing overhead, network latency, complex deployments, and boundary drift. Conversely, an unstructured monolith leads to tight coupling between research calculations and broker interactions, which is dangerous in financial trading.

## Decision
We adopt a **Modular Monolith in a Single Repository (Monorepo)**:
1. A unified Git repository containing `apps/`, `services/`, and shared `packages/`.
2. Clear code boundaries enforced by language packaging and import linting.
3. Decoupled async execution via Redis queues (`rq`/Celery) with worker processes running isolated compute tasks.
4. Shared contracts defined in `packages/strategy_spec` and `packages/shared_types`, reused across services.

## Consequences
### Positive
- Single source of truth for strategy schemas, indicator definitions, and database models.
- Atomic commits and synchronized releases across frontend, API, and worker services.
- Simple local development setup (one `docker-compose.yml`).
- Zero network serialization overhead between internal compiler and validation routines.

### Negative / Trade-offs
- Strict discipline required to prevent circular imports between `services/` and `packages/`.
- CI runs need path filtering to avoid running frontend builds on backend-only changes.
