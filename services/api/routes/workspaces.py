"""Workspace management and dashboard summary API routes."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from packages.shared_types.errors import TradingWaveError
from services.api.database import get_db
from services.api.dependencies.auth import get_current_user, get_workspace_membership
from services.api.models.audit import AuditEvent
from services.api.models.strategy import (
    BacktestJob,
    PaperSession,
    Strategy,
    StrategyVersion,
)
from services.api.models.user import User
from services.api.models.workspace import Workspace, WorkspaceMember
from services.api.schemas.auth import (
    DashboardSummaryResponse,
    WorkspaceCreateRequest,
    WorkspaceResponse,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces & Multi-Tenancy"])


@router.get("", response_model=dict)
def list_workspaces(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """List all workspaces that the authenticated user belongs to."""
    correlation_id = getattr(request.state, "correlation_id", "ws-list")
    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id).all()

    workspaces: list[WorkspaceResponse] = []
    for m in memberships:
        ws = db.query(Workspace).filter(Workspace.id == m.workspace_id).first()
        if ws:
            workspaces.append(
                WorkspaceResponse(
                    id=ws.id,
                    name=ws.name,
                    plan_code=ws.plan_code,
                    role=m.role,
                    created_at=ws.created_at,
                )
            )

    return {
        "data": [w.model_dump() for w in workspaces],
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.post("", response_model=dict)
def create_workspace(
    payload: WorkspaceCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a new tenant workspace and assign the current user as owner."""
    correlation_id = getattr(request.state, "correlation_id", "ws-create")

    workspace = Workspace(
        owner_user_id=current_user.id,
        name=payload.name,
        plan_code=payload.plan_code,
    )
    db.add(workspace)
    db.flush()

    membership = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(membership)

    audit = AuditEvent(
        workspace_id=workspace.id,
        actor_user_id=current_user.id,
        event_type="WORKSPACE_CREATED",
        resource_type="WORKSPACE",
        resource_id=workspace.id,
        correlation_id=correlation_id,
        metadata_payload={"name": workspace.name, "plan_code": workspace.plan_code},
    )
    db.add(audit)
    db.commit()
    db.refresh(workspace)

    response = WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        plan_code=workspace.plan_code,
        role="owner",
        created_at=workspace.created_at,
    )

    return {
        "data": response.model_dump(),
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.get("/{workspace_id}", response_model=dict)
def get_workspace_details(
    workspace_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Retrieve details for a specific workspace. Enforces tenant membership check."""
    correlation_id = getattr(request.state, "correlation_id", "ws-detail")
    membership = get_workspace_membership(
        workspace_id=workspace_id,
        current_user=current_user,
        db=db,
    )

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise TradingWaveError("Workspace not found.", code="RESOURCE_NOT_FOUND", status_code=404)

    response = WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        plan_code=ws.plan_code,
        role=membership.role,
        created_at=ws.created_at,
    )

    return {
        "data": response.model_dump(),
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.get("/{workspace_id}/dashboard-summary", response_model=dict)
def get_dashboard_summary(
    workspace_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return real persisted statistics for the active workspace."""
    correlation_id = getattr(request.state, "correlation_id", "ws-dashboard")
    get_workspace_membership(
        workspace_id=workspace_id,
        current_user=current_user,
        db=db,
    )

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise TradingWaveError("Workspace not found.", code="RESOURCE_NOT_FOUND", status_code=404)

    # Count real persisted records
    strategies_count = db.query(Strategy).filter(Strategy.workspace_id == workspace_id).count()
    versions_count = (
        db.query(StrategyVersion)
        .join(Strategy, Strategy.id == StrategyVersion.strategy_id)
        .filter(Strategy.workspace_id == workspace_id)
        .count()
    )
    backtests_count = db.query(BacktestJob).filter(BacktestJob.workspace_id == workspace_id).count()
    paper_sessions_count = (
        db.query(PaperSession).filter(PaperSession.workspace_id == workspace_id).count()
    )

    summary = DashboardSummaryResponse(
        workspace_id=ws.id,
        workspace_name=ws.name,
        plan_code=ws.plan_code,
        saved_strategies_count=strategies_count,
        published_versions_count=versions_count,
        recent_backtests_count=backtests_count,
        running_paper_sessions_count=paper_sessions_count,
        risk_limits=ws.risk_limits,
        live_broker_connected=False,
        live_broker_message="Live trading is disabled until compliance approvals are certified.",
    )

    return {
        "data": summary.model_dump(),
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }
