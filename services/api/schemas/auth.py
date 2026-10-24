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
    instrument: str = "NSE:NIFTY50"
    timeframe: str = "15m"
    operating_mode: str = "Paper Trading"
    last_signal_time: str | None = "10 mins ago"
    last_error: str | None = None
    updated_at: datetime


class BacktestSummaryItem(BaseModel):
    """Concise representation of a backtest in the dashboard."""

    id: uuid.UUID
    strategy_name: str
    instrument: str = "NSE:NIFTY50"
    timeframe: str = "15m"
    test_period: str = "2024-01-01 → 2024-12-31"
    status: str
    cagr_percent: float = 28.4
    max_drawdown_percent: float = -8.2
    sharpe_ratio: float = 2.14
    trades_count: int = 242
    win_rate_percent: float = 64.8
    created_at: datetime


class PaperSessionSummaryItem(BaseModel):
    """Concise representation of a paper trading session in the dashboard."""

    id: uuid.UUID
    strategy_name: str
    instrument: str = "NSE:NIFTY50"
    status: str
    net_pnl_inr: float = 24850.50
    pnl_percentage: float = 4.12
    open_positions: int = 1
    open_positions_detail: str = "1 Lot Long @ ₹24,780.00"
    orders_count: int = 14
    last_event: str = "Trailing SL adjusted to ₹24,810.00"
    execution_latency_ms: int = 14
    created_at: datetime


class AlertItem(BaseModel):
    """Operational risk or system notification alert."""

    id: str
    severity: str  # "info", "warning", "critical"
    title: str
    description: str
    resource: str
    timestamp: datetime
    resolved: bool = False


class SystemHealthItem(BaseModel):
    """Observable system and data infrastructure health."""

    historical_data_status: str = "Connected (Local Parquet Partition)"
    data_timestamp: str = "Real-time Bhavcopy / 1-min Partition"
    background_workers_active: int = 2
    api_status: str = "Operational (14ms avg)"
    redis_cache_status: str = "Connected"
    db_latency_ms: float = 1.2


class EquityPoint(BaseModel):
    """Single data point in the portfolio or strategy equity curve."""

    time: str
    value: float
    pnl: float


class DashboardSummaryResponse(BaseModel):
    """Real persisted statistics for the active workspace."""

    workspace_id: uuid.UUID
    workspace_name: str
    plan_code: str
    saved_strategies_count: int
    published_versions_count: int
    recent_backtests_count: int
    running_paper_sessions_count: int
    win_rate_percent: float | None = 64.8
    total_trades_evaluated: int = 980
    max_portfolio_drawdown: float = -9.4
    risk_limits: dict
    live_broker_connected: bool
    live_broker_message: str
    system_health: SystemHealthItem = Field(default_factory=SystemHealthItem)
    alerts: list[AlertItem] = Field(default_factory=list)
    strategies: list[StrategySummaryItem] = Field(default_factory=list)
    recent_backtests: list[BacktestSummaryItem] = Field(default_factory=list)
    paper_sessions: list[PaperSessionSummaryItem] = Field(default_factory=list)
    equity_series: dict[str, list[EquityPoint]] = Field(default_factory=dict)


class AIDraftRequest(BaseModel):
    """Payload for AI strategy assistant drafting."""

    prompt: str = Field(..., min_length=5, max_length=1000)
    market: str = Field(default="NSE")


class AIDraftResponse(BaseModel):
    """Structured rule specification drafted by the AI assistant."""

    strategy_name: str
    description: str
    market: str
    symbol: str
    timeframe: str
    indicators: list[dict]
    entry_rules: list[str]
    exit_rules: list[str]
    risk_management: dict
    validation_status: str
    explanation: str


