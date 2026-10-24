# TradingWave 🌊
**AI-Powered Algorithmic Trading SaaS for Indian Markets**  
*Target Market: India (NSE / BSE)*  
*Architecture: Modular Monolith + Isolated Compute Workers*  
*Version: 1.0.0 (Phase 0 Complete)*  

---

## 1. Overview & Vision

TradingWave is an institutional-grade, AI-assisted algorithmic trading SaaS engineered specifically for the Indian equities and derivatives landscape. It provides an end-to-end quantitative workflow allowing traders, quant researchers, and advisory desks to:

1. **Design Strategies** using natural language (AI Strategy Studio) or a visual Directed Acyclic Graph (DAG) node builder (React Flow).
2. **Deterministically Validate & Compile** trading rules into immutable, versioned specifications with cryptographic hash verification (`SHA-256`).
3. **Backtest on Licensed Historical Indian Market Data** with granular Indian statutory cost accounting (STT, GST, Exchange turnover fees, Stamp duty, and slippage).
4. **Simulate & Paper-Trade** across real-time replay or live feeds with virtual order-state machines and zero live-capital risk.
5. **Gated Broker Integration:** Future broker live trading is strictly locked behind a machine-readable SEBI/exchange compliance gate.

---

## 2. Core Architectural & Regulatory Principles

- **Deterministic & Reproducible:** A given strategy version and historical data partition will always produce bit-for-bit identical results.
- **AI Sandboxing:** AI outputs are treated as untrusted drafts. The AI cannot place orders, execute arbitrary code, or modify compliance flags.
- **Strict Separation of Concerns:** Research and simulation compute workers operate in isolated network environments with zero access to live broker credentials.
- **No Fabricated Data:** The platform never displays hardcoded P&L or fake metrics. If data or connections do not exist, clear empty states are shown.
- **SEBI & Exchange Compliance:** Designed around the SEBI Retail Algo circular (Feb 2025) and NSE Non-NEAT Algo Provider procedures.

---

## 3. Repository Architecture

```
TradingWave/
├── apps/
│   └── web/                   # Next.js 14+ frontend (App Router, Tailwind CSS, React Flow)
├── services/
│   ├── api/                   # FastAPI backend gateway (Auth, Strategy CRUD, Job dispatch)
│   ├── strategy_engine/       # AST canonicalizer, cycle validator, hash generator
│   ├── backtest_worker/       # Isolated event-driven backtesting engine
│   ├── paper_trading/         # Virtual order-state machine & session replay
│   └── broker_adapters/       # Broker connectivity layer (strictly gated)
├── packages/
│   ├── strategy_spec/         # Shared Pydantic strategy models & schemas
│   ├── indicator_library/     # Pure mathematical indicator routines (EMA, RSI, etc.)
│   ├── api_client/            # Typed API client library
│   └── shared_types/          # Domain types, error envelopes, correlation context
├── migrations/                # Alembic database migrations
├── tests/
│   ├── unit/                  # Fast deterministic unit tests
│   ├── integration/           # DB & Redis integration tests
│   ├── security/              # Tenant boundary & authorization tests
│   ├── backtesting/           # Correctness tests against known bar series
│   └── end_to_end/            # System workflow tests
├── infrastructure/
│   ├── docker/                # Production & local Dockerfile definitions
│   └── deployment/            # Deployment automation & configurations
├── docs/                      # Architectural specifications & compliance records
│   ├── architecture.md        # Complete system architecture specification
│   ├── security.md            # STRIDE threat model & tenant isolation
│   ├── api-contracts.md       # OpenAPI / REST v1 endpoint contracts
│   ├── compliance-gates.md    # SEBI / NSE regulatory release gates
│   ├── operations-runbook.md  # DevOps & SRE operational manual
│   └── adr/                   # Architecture Decision Records (ADRs)
├── storage/                   # Storage root for historical Parquet datasets & artifacts
├── docker-compose.yml         # Local development environment orchestration
├── pyproject.toml             # Python dependencies, build system & test configuration
└── package.json               # Node.js monorepo workspace configuration
```

---

## 4. Documentation Index

- [System Architecture Specification](docs/architecture.md)
- [Security Model & STRIDE Threat Analysis](docs/security.md)
- [API Contracts & Endpoints Specification](docs/api-contracts.md)
- [Indian Regulatory Compliance & Release Gates](docs/compliance-gates.md)
- [Operations & Reliability Runbook](docs/operations-runbook.md)
- **Architecture Decision Records:**
  - [ADR-0001: Monorepo with Modular Monolith Architecture](docs/adr/0001-monorepo-modular-monolith.md)
  - [ADR-0002: Deterministic Strategy Compiler & Hashing](docs/adr/0002-deterministic-strategy-compiler.md)
  - [ADR-0003: Isolation of Simulation and Live Execution Pathways](docs/adr/0003-isolation-of-simulation-and-execution.md)
  - [ADR-0004: SEBI Regulatory Gating Architecture](docs/adr/0004-sebi-regulatory-gating-architecture.md)
  - [ADR-0005: Multi-Tenant Workspace Isolation and Audit Logging](docs/adr/0005-multi-tenant-isolation-and-audit.md)

---

## 5. Phased Implementation Roadmap

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 0** | Repository & Architecture Foundation | **Complete** |
| **Phase 1** | Application Foundation, Identity & Workspace Isolation | Next |
| **Phase 2** | Strategy Data Model & React Flow Visual Builder | Queued |
| **Phase 3** | AI Strategy Studio with Structured Schema Validation | Queued |
| **Phase 4** | Historical Data Ingestion & Deterministic Backtesting | Queued |
| **Phase 5** | Paper-Trading Engine & Event Replay Runtime | Queued |
| **Phase 6** | Security Hardening & Threat Model Remediation | Queued |
| **Phase 7** | Broker Integration Foundation (Dormant Live Gate) | Queued |
| **Phase 8** | Pre-Production Compliance & Operational Audit Review | Queued |
| **Phase 9** | SaaS Subscription, Entitlements & Strategy Marketplace | Queued |

---

## 6. Local Development Setup

### 6.1 Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose

### 6.2 Step-by-Step Instructions

1. **Environment Configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Start Infrastructure Services (PostgreSQL & Redis):**
   ```bash
   docker compose up -d postgres redis
   ```

3. **Install Python Environment & Packages:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -e ".[dev]"
   ```

4. **Install Node.js Monorepo Dependencies:**
   ```bash
   npm install
   ```

5. **Run Architecture & Code Quality Tests:**
   ```bash
   pytest
   ```

---

## 7. Regulatory & Compliance Notice

> **IMPORTANT NOTICE:**  
> TradingWave is a quantitative research and trading software technology provider. TradingWave is not a SEBI-registered Investment Adviser (IA) or Research Analyst (RA). The platform does not offer investment advice, buy/sell recommendations, or guaranteed returns.  
> Backtested and paper-trading performance figures are purely hypothetical and simulated.  
> Live automated execution is subject to applicable SEBI regulations and broker empanelment policies and is explicitly disabled in this release.
