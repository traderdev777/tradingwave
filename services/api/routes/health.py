"""System health and readiness check routes."""

import os
from datetime import UTC, datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel

from services.api.config import get_settings

router = APIRouter(tags=["System Health"])


class HealthData(BaseModel):
    status: str
    environment: str
    app_name: str
    timestamp: str


class ReadinessData(BaseModel):
    status: str
    storage_accessible: bool
    live_trading_enabled: bool
    sebi_gate_active: bool
    emergency_kill_switch_active: bool
    timestamp: str


class StandardEnvelope(BaseModel):
    data: dict
    meta: dict


@router.get("/health", response_model=StandardEnvelope)
async def liveness(request: Request) -> StandardEnvelope:
    """Liveness probe to confirm FastAPI server is alive."""
    settings = get_settings()
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    now_utc = datetime.now(UTC).isoformat()

    return StandardEnvelope(
        data={
            "status": "healthy",
            "environment": settings.APP_ENV,
            "app_name": settings.APP_NAME,
            "timestamp": now_utc,
        },
        meta={
            "request_id": correlation_id,
            "timestamp": now_utc,
        },
    )


@router.get("/health/ready", response_model=StandardEnvelope)
async def readiness(request: Request) -> StandardEnvelope:
    """Readiness probe verifying operational storage and compliance gates."""
    settings = get_settings()
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    now_utc = datetime.now(UTC).isoformat()

    storage_ok = os.path.exists(settings.STORAGE_LOCAL_ROOT) and os.access(
        settings.STORAGE_LOCAL_ROOT, os.W_OK
    )

    return StandardEnvelope(
        data={
            "status": "ready",
            "storage_accessible": storage_ok,
            "live_trading_enabled": settings.LIVE_TRADING_ENABLED,
            "sebi_gate_active": settings.SEBI_COMPLIANCE_GATE_ACTIVE,
            "emergency_kill_switch_active": settings.EMERGENCY_KILL_SWITCH_ACTIVE,
            "timestamp": now_utc,
        },
        meta={
            "request_id": correlation_id,
            "timestamp": now_utc,
        },
    )
