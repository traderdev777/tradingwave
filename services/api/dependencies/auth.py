"""Authentication, JWT extraction, and workspace tenant isolation dependencies."""

import uuid

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from packages.shared_types.errors import TenantAccessDeniedError, TradingWaveError
from services.api.database import get_db
from services.api.models.user import User
from services.api.models.workspace import WorkspaceMember
from services.api.services.auth_service import decode_access_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Validate Bearer JWT and retrieve the active user account."""
    if not credentials or not credentials.credentials:
        raise TradingWaveError(
            "Authentication token is missing.",
            code="UNAUTHENTICATED",
            status_code=401,
        )

    user_id = decode_access_token(credentials.credentials)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise TradingWaveError(
            "User account does not exist.",
            code="UNAUTHENTICATED",
            status_code=401,
        )

    if user.status != "active":
        raise TradingWaveError(
            "User account has been suspended.",
            code="ACCOUNT_SUSPENDED",
            status_code=403,
        )

    return user


def get_workspace_membership(
    workspace_id: uuid.UUID | None = None,
    x_workspace_id: str | None = Header(None, alias="X-Workspace-ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WorkspaceMember:
    """Enforce workspace tenant boundary: verify user is a member of the targeted workspace."""
    target_ws_id: uuid.UUID | None = workspace_id

    if not target_ws_id and x_workspace_id:
        try:
            target_ws_id = uuid.UUID(x_workspace_id)
        except ValueError as exc:
            raise TradingWaveError(
                "Invalid X-Workspace-ID header format.",
                code="INVALID_WORKSPACE_ID",
                status_code=400,
            ) from exc

    if not target_ws_id:
        raise TradingWaveError(
            "Target workspace ID must be provided via path parameter or X-Workspace-ID header.",
            code="WORKSPACE_REQUIRED",
            status_code=400,
        )

    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == target_ws_id,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )

    if not membership:
        raise TenantAccessDeniedError(
            f"User '{current_user.email}' is not authorized to access workspace '{target_ws_id}'."
        )

    return membership
