# TradingWave — Operations & Reliability Runbook
**Classification:** DevOps & Site Reliability Engineering (SRE) Manual  
**Target Availability:** 99.9% Uptime during Indian Market Trading Hours (09:00 - 16:00 IST)  

---

## 1. Environment Topology

| Environment | Purpose | Database | Live Trading Permitted? |
| :--- | :--- | :--- | :--- |
| **Local Dev** | Feature development & unit testing | Local Docker PostgreSQL 16 & Redis | **Strictly NO** (`LIVE_TRADING_ENABLED=false`) |
| **CI / Test** | Automated regressions, linting, tests | Ephemeral PostgreSQL service container | **Strictly NO** |
| **Staging** | Pre-production validation & sandbox | Managed PostgreSQL & Redis (isolated VPC) | **Sandbox Only** |
| **Production** | Live SaaS operations | Managed Cloud PostgreSQL (Multi-AZ, Mumbai) | **Subject to Gate D/E Compliance** |

---

## 2. Infrastructure Setup & Local Execution

### 2.1 Prerequisites
- Python 3.11 or 3.12 (`python3 --version`)
- Node.js 20+ (`node -v`)
- Docker & Docker Compose (`docker compose version`)
- Git

### 2.2 Quick Start (Local Development)
```bash
# 1. Clone repository and navigate to root
cd TradingWave

# 2. Copy environment template
cp .env.example .env

# 3. Start local PostgreSQL and Redis dependencies
docker compose up -d postgres redis

# 4. Set up Python virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev]"

# 5. Run database migrations (when alembic is configured)
# alembic upgrade head

# 6. Start the FastAPI backend
uvicorn services.api.main:app --host 0.0.0.0 --port 8000 --reload

# 7. Start the background worker (in a separate terminal)
source .venv/bin/activate
python -m services.backtest_worker.main

# 8. Set up and start Next.js frontend (in a separate terminal)
npm install
npm run dev
```

---

## 3. Database Operations & Disaster Recovery

### 3.1 Migrations with Alembic
```bash
# Generate a new migration after modifying SQLAlchemy models
alembic revision --autogenerate -m "create_initial_schema"

# Review the generated migration in migrations/versions/
# Apply migrations to database
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### 3.2 Backup & Point-in-Time Recovery (PITR)
- **Continuous Archiving:** PostgreSQL Write-Ahead Logs (WAL) are streamed to encrypted object storage (`storage/wal` or AWS S3).
- **Daily Full Backups:** Automated `pg_dump` snapshot taken daily at 01:00 IST (outside market hours).
- **Restore Verification Test:** Automated weekly job restores the snapshot into an isolated test instance to verify backup integrity.

---

## 4. Operational Incident Playbooks

### Playbook 1: Emergency Kill Switch Activation
**Trigger:** Unusual market volatility, systemic order failure, broker API malfunction, or user-reported anomaly.
```bash
# Method A: Via API (Workspace or Admin)
curl -X POST http://localhost:8000/api/v1/workspaces/{workspace_id}/emergency-stop \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Method B: Global Redis Trip (Instant Zero-Order Latch)
redis-cli SET "tradingwave:emergency_kill_switch_active" "true"
```
**Expected Outcome:**
1. Background workers reject any new order generation.
2. Active paper trading sessions transition to `STOPPED` state.
3. System status changes to `ALERT_HALTED` across all connected dashboards.
4. An `audit_events` row with high severity is recorded.

---

### Playbook 2: Worker Queue Backlog & Stuck Jobs
**Trigger:** Backtest jobs remain in `QUEUED` or `RUNNING` state beyond the maximum execution timeout (default: 5 minutes).
```bash
# 1. Inspect Redis queue length
redis-cli LLEN "rq:queue:backtests"

# 2. Check running worker processes
ps aux | grep "services.backtest_worker"

# 3. Clean up orphaned jobs (jobs where worker died without updating DB)
python -m services.backtest_worker.cleanup_orphaned_jobs
```

---

### Playbook 3: Broker Disconnect & State Reconciliation
**Trigger:** Live execution worker loses heartbeat connection to broker gateway.
1. The adapter attempts exponential backoff reconnect for up to 30 seconds.
2. If reconnect fails, the deployment transitions to `DISCONNECTED_RECONCILING`.
3. New strategy signals are buffered but NOT executed.
4. On reconnection, `reconcile_orders()` and `reconcile_positions()` execute immediately.
5. If position discrepancy exceeds `lot_size` tolerance, trading is locked and alert dispatched to compliance officer.

---

## 5. Observability & Health Checks

### Endpoints:
- `GET /api/v1/health`: Checks process viability (FastAPI HTTP 200).
- `GET /api/v1/health/ready`: Deep healthcheck verifying:
  - PostgreSQL connection pool response (< 100ms)
  - Redis ping (< 10ms)
  - Dataset storage directory readability
  - Compliance gate status flag

### Key Metrics to Monitor:
1. `api_request_duration_seconds`: P95 API latency (< 250ms target)
2. `backtest_queue_depth`: Number of pending backtests
3. `backtest_execution_duration_seconds`: Compute duration per job
4. `worker_memory_rss_bytes`: Per-worker memory footprint (leak detection)
5. `security_cross_tenant_access_attempts_total`: Any unauthorized workspace query attempt (must be 0)
