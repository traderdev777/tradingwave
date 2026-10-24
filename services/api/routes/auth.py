"""Authentication and session management API routes."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from services.api.database import get_db
from services.api.dependencies.auth import get_current_user
from services.api.models.audit import AuditEvent
from services.api.models.user import User
from services.api.models.workspace import Workspace, WorkspaceMember
from services.api.schemas.auth import (
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    WorkspaceResponse,
)
from services.api.services.auth_service import (
    authenticate_user,
    get_or_create_demo_session,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


@router.post("/demo-session", response_model=dict)
def create_demo_session(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Retrieve or seed the ready developer demonstration workspace session."""
    correlation_id = getattr(request.state, "correlation_id", "demo-session")
    session_data = get_or_create_demo_session(db, correlation_id)
    return {
        "data": session_data.model_dump(),
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }



@router.post("/register", response_model=dict)
def register(
    payload: UserRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Register a new user account and provision their initial tenant workspace."""
    correlation_id = getattr(request.state, "correlation_id", "reg-default")
    register_user(db, payload, correlation_id)

    # Return active session directly on successful registration
    session_data = authenticate_user(db, payload.email, payload.password, correlation_id)
    return {
        "data": session_data.model_dump(),
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.post("/session", response_model=dict)
def create_session(
    payload: UserLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Authenticate credentials and establish an active user session."""
    correlation_id = getattr(request.state, "correlation_id", "auth-session")
    session_data = authenticate_user(db, payload.email, payload.password, correlation_id)
    return {
        "data": session_data.model_dump(),
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


@router.delete("/session", response_model=dict)
def destroy_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Terminate the current user session and record logout in audit trail."""
    correlation_id = getattr(request.state, "correlation_id", "logout")
    audit = AuditEvent(
        workspace_id=current_user.id,  # or active workspace
        actor_user_id=current_user.id,
        event_type="USER_LOGOUT",
        resource_type="USER",
        resource_id=current_user.id,
        correlation_id=correlation_id,
        metadata_payload={"email": current_user.email},
    )
    db.add(audit)
    db.commit()

    return {
        "data": {"status": "session_terminated"},
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }


users_router = APIRouter(prefix="/users", tags=["Users"])


@users_router.get("/me", response_model=dict)
def get_current_user_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return the profile and workspaces of the authenticated user."""
    correlation_id = getattr(request.state, "correlation_id", "users-me")
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
        "data": {
            "user": UserResponse.model_validate(current_user).model_dump(),
            "workspaces": [w.model_dump() for w in workspaces],
        },
        "meta": {
            "request_id": correlation_id,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    }
