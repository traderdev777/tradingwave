"""Authentication and password hashing service."""

import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from sqlalchemy.orm import Session

from packages.shared_types.errors import TradingWaveError
from services.api.config import get_settings
from services.api.models.audit import AuditEvent
from services.api.models.user import User
from services.api.models.workspace import Workspace, WorkspaceMember
from services.api.schemas.auth import (
    SessionResponse,
    TokenResponse,
    UserRegisterRequest,
    UserResponse,
    WorkspaceResponse,
)

settings = get_settings()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(
    user_id: uuid.UUID,
    expires_delta: timedelta | None = None,
) -> tuple[str, int]:
    """Create JWT access token containing subject claim and expiration."""
    expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
        expire_minutes = int(expires_delta.total_seconds() // 60)
    else:
        expire = datetime.now(UTC) + timedelta(minutes=expire_minutes)

    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire_minutes


def decode_access_token(token: str) -> uuid.UUID:
    """Decode and validate JWT access token, returning user UUID."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            raise TradingWaveError(
                "Invalid token payload",
                code="UNAUTHENTICATED",
                status_code=401,
            )
        return uuid.UUID(user_id_str)
    except jwt.PyJWTError as exc:
        raise TradingWaveError(
            f"Token validation failed: {exc}",
            code="UNAUTHENTICATED",
            status_code=401,
        ) from exc


def register_user(db: Session, request: UserRegisterRequest, correlation_id: str) -> User:
    """Register new user, create default workspace, and log audit event."""
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise TradingWaveError(
            f"User with email '{request.email}' already exists.",
            code="RESOURCE_CONFLICT",
            status_code=409,
        )

    user = User(
        email=request.email,
        display_name=request.display_name,
        password_hash=hash_password(request.password),
        status="active",
    )
    db.add(user)
    db.flush()

    # Create default workspace
    workspace = Workspace(
        owner_user_id=user.id,
        name=request.workspace_name,
        plan_code="starter",
    )
    db.add(workspace)
    db.flush()

    # Create workspace membership
    membership = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role="owner",
    )
    db.add(membership)

    # Record audit event
    audit = AuditEvent(
        workspace_id=workspace.id,
        actor_user_id=user.id,
        event_type="USER_REGISTERED",
        resource_type="USER",
        resource_id=user.id,
        correlation_id=correlation_id,
        metadata_payload={"email": user.email, "workspace_id": str(workspace.id)},
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(
    db: Session,
    email: str,
    password: str,
    correlation_id: str,
) -> SessionResponse:
    """Authenticate user credentials and return authenticated session response."""
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise TradingWaveError(
            "Invalid email or password.",
            code="UNAUTHENTICATED",
            status_code=401,
        )

    if user.status != "active":
        raise TradingWaveError(
            "User account is not active.",
            code="ACCOUNT_SUSPENDED",
            status_code=403,
        )

    # Fetch user's workspaces
    memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).all()
    if not memberships:
        raise TradingWaveError(
            "User does not belong to any workspace.",
            code="NO_WORKSPACE_FOUND",
            status_code=404,
        )

    workspace_responses: list[WorkspaceResponse] = []
    for m in memberships:
        ws = db.query(Workspace).filter(Workspace.id == m.workspace_id).first()
        if ws:
            workspace_responses.append(
                WorkspaceResponse(
                    id=ws.id,
                    name=ws.name,
                    plan_code=ws.plan_code,
                    role=m.role,
                    created_at=ws.created_at,
                )
            )

    active_ws = workspace_responses[0]
    token_str, expires_min = create_access_token(user.id)

    # Record login audit event
    audit = AuditEvent(
        workspace_id=active_ws.id,
        actor_user_id=user.id,
        event_type="USER_LOGIN_SUCCESS",
        resource_type="USER",
        resource_id=user.id,
        correlation_id=correlation_id,
        metadata_payload={"email": user.email},
    )
    db.add(audit)
    db.commit()

    return SessionResponse(
        user=UserResponse.model_validate(user),
        active_workspace=active_ws,
        workspaces=workspace_responses,
        token=TokenResponse(access_token=token_str, expires_in_minutes=expires_min),
    )
