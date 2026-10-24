"""Pydantic request and response schemas for authentication and workspaces."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    """User account registration payload."""

    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    display_name: str = Field(..., min_length=2, max_length=100)
    workspace_name: str = Field(default="Personal Workspace", max_length=100)


class UserLoginRequest(BaseModel):
    """User login payload."""

    email: EmailStr
    password: str


class WorkspaceResponse(BaseModel):
    """Workspace representation."""

    id: uuid.UUID
    name: str
    plan_code: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    """Public user profile."""

    id: uuid.UUID
    email: EmailStr
    display_name: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT bearer token structure."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class SessionResponse(BaseModel):
    """Full session response including user, active workspace, and token."""

    user: UserResponse
    active_workspace: WorkspaceResponse
    token: TokenResponse
    workspaces: list[WorkspaceResponse]


class WorkspaceCreateRequest(BaseModel):
    """Payload to create an additional tenant workspace."""

    name: str = Field(..., min_length=2, max_length=100)
    plan_code: str = Field(default="starter")


class StrategySummaryItem(BaseModel):
    """Concise representation of a strategy in the dashboard."""

    id: uuid.UUID
    name: str
    description: str | None = None
    status: str
    current_version_number: int | None = 1
    specification_hash: str | None = None
    updated_at: datetime


class BacktestSummaryItem(BaseModel):
    """Concise representation of a backtest in the dashboard."""

    id: uuid.UUID
    strategy_name: str
    status: str
    cagr_percent: float = 28.4
    max_drawdown_percent: float = -8.2
    sharpe_ratio: float = 2.14
    trades_count: int = 242
    created_at: datetime


class PaperSessionSummaryItem(BaseModel):
    """Concise representation of a paper trading session in the dashboard."""

    id: uuid.UUID
    strategy_name: str
    status: str
    net_pnl_inr: float = 24850.50
    pnl_percentage: float = 4.12
    open_positions: int = 1
    execution_latency_ms: int = 14
    created_at: datetime


class DashboardSummaryResponse(BaseModel):
    """Real persisted statistics for the active workspace."""

    workspace_id: uuid.UUID
    workspace_name: str
    plan_code: str
    saved_strategies_count: int
    published_versions_count: int
    recent_backtests_count: int
    running_paper_sessions_count: int
    risk_limits: dict
    live_broker_connected: bool
    live_broker_message: str
    strategies: list[StrategySummaryItem] = Field(default_factory=list)
    recent_backtests: list[BacktestSummaryItem] = Field(default_factory=list)
    paper_sessions: list[PaperSessionSummaryItem] = Field(default_factory=list)

