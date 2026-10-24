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


def get_or_create_demo_session(db: Session, correlation_id: str) -> SessionResponse:
    """Retrieve or provision the ready developer/demo account with seeded workspace."""
    email = "trader@tradingwave.in"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            display_name="Supreeth Thakur (Quant Dev)",
            password_hash=hash_password("DemoTrader2026#"),
            status="active",
        )
        db.add(user)
        db.flush()

    ws = db.query(Workspace).filter(Workspace.owner_user_id == user.id).first()
    if not ws:
        ws = Workspace(
            owner_user_id=user.id,
            name="Flagship Indian Alpha",
            plan_code="institutional",
            risk_limits={
                "max_open_positions": 3,
                "max_exposure_inr": 500000,
                "daily_loss_limit_inr": 15000,
                "max_drawdown_percent": 12.5,
            },
        )
        db.add(ws)
        db.flush()
        mem = WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="owner")
        db.add(mem)
        db.flush()

    # Ensure strategies exist
    from services.api.models.strategy import BacktestJob, PaperSession, Strategy, StrategyVersion

    if db.query(Strategy).filter(Strategy.workspace_id == ws.id).count() == 0:
        s1 = Strategy(
            workspace_id=ws.id,
            owner_user_id=user.id,
            name="NIFTY 15m Supertrend VWAP Breakout",
            description="Dual-indicator trend breakout on NSE NIFTY 50 with intraday VWAP confirmation and ATR trailing stop.",
            status="published",
        )
        db.add(s1)
        db.flush()

        v1 = StrategyVersion(
            strategy_id=s1.id,
            version_number=1,
            specification={"market": "NSE", "symbol": "NIFTY50", "timeframe": "15m"},
            specification_hash="7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
            compiler_version="1.0.0",
            created_by=user.id,
        )
        db.add(v1)
        db.flush()
        s1.current_version_id = v1.id

        s2 = Strategy(
            workspace_id=ws.id,
            owner_user_id=user.id,
            name="BANKNIFTY 5m EMA Crossover Scalper",
            description="Fast 9/21 EMA crossover on BankNifty index futures with RSI momentum filter and tight intraday target.",
            status="published",
        )
        db.add(s2)
        db.flush()

        v2 = StrategyVersion(
            strategy_id=s2.id,
            version_number=1,
            specification={"market": "NSE", "symbol": "BANKNIFTY", "timeframe": "5m"},
            specification_hash="4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
            compiler_version="1.0.0",
            created_by=user.id,
        )
        db.add(v2)
        db.flush()
        s2.current_version_id = v2.id

        s3 = Strategy(
            workspace_id=ws.id,
            owner_user_id=user.id,
            name="Reliance Mean Reversion Bands",
            description="Bollinger Bands 20,2 intraday reversion strategy on large-cap equity with 15:15 IST auto-squareoff.",
            status="draft",
        )
        db.add(s3)
        db.flush()

        b1 = BacktestJob(workspace_id=ws.id, strategy_version_id=v1.id, status="COMPLETED")
        b2 = BacktestJob(workspace_id=ws.id, strategy_version_id=v2.id, status="COMPLETED")
        db.add_all([b1, b2])

        p1 = PaperSession(workspace_id=ws.id, strategy_version_id=v1.id, status="RUNNING")
        db.add(p1)

    db.commit()

    token_str, expires_min = create_access_token(user.id)
    ws_response = WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        plan_code=ws.plan_code,
        role="owner",
        created_at=ws.created_at,
    )

    return SessionResponse(
        user=UserResponse.model_validate(user),
        active_workspace=ws_response,
        workspaces=[ws_response],
        token=TokenResponse(access_token=token_str, expires_in_minutes=expires_min),
    )

