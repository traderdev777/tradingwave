"""Typed Pydantic v2 Strategy Specification AST Schema for TradingWave.

Defines deterministic, machine-readable specifications for Indian market algorithmic strategies.
"""

from __future__ import annotations

import hashlib
import json
from enum import Enum
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class Exchange(str, Enum):
    NSE = "NSE"
    BSE = "BSE"
    MCX = "MCX"


class Timeframe(str, Enum):
    M1 = "1m"
    M3 = "3m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    D1 = "1d"


class ConditionOperator(str, Enum):
    CROSSES_ABOVE = "CROSSES_ABOVE"
    CROSSES_BELOW = "CROSSES_BELOW"
    GREATER_THAN = "GREATER_THAN"
    LESS_THAN = "LESS_THAN"
    EQUALS = "EQUALS"
    BETWEEN = "BETWEEN"


class IndicatorType(str, Enum):
    EMA = "EMA"
    SMA = "SMA"
    RSI = "RSI"
    SUPERTREND = "SUPERTREND"
    VWAP = "VWAP"
    ATR = "ATR"
    MACD = "MACD"
    BOLLINGER_BANDS = "BOLLINGER_BANDS"
    STOCHASTIC = "STOCHASTIC"


class PositionSizingMethod(str, Enum):
    FIXED_QUANTITY = "FIXED_QUANTITY"
    FIXED_CAPITAL = "FIXED_CAPITAL"
    PERCENTAGE_OF_CAPITAL = "PERCENTAGE_OF_CAPITAL"
    RISK_BASED = "RISK_BASED"


class StrategyCategory(str, Enum):
    MOMENTUM = "MOMENTUM"
    MEAN_REVERSION = "MEAN_REVERSION"
    BREAKOUT = "BREAKOUT"
    TREND_FOLLOWING = "TREND_FOLLOWING"
    SCALPING = "SCALPING"
    VOLATILITY = "VOLATILITY"


class StrategyLifecycleState(str, Enum):
    DRAFT = "DRAFT"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
    VALIDATED = "VALIDATED"
    BACKTEST_PENDING = "BACKTEST_PENDING"
    BACKTESTED = "BACKTESTED"
    PAPER_ELIGIBLE = "PAPER_ELIGIBLE"


class IndicatorSpec(BaseModel):
    """Configuration for a technical indicator."""

    id: str = Field(default_factory=lambda: f"ind_{uuid4().hex[:8]}")
    type: IndicatorType
    period: int = Field(default=14, ge=1, le=500)
    multiplier: float | None = Field(default=None, ge=0.1, le=20.0)
    source: str = Field(default="close")
    timeframe: Timeframe | None = None
    params: dict[str, Any] = Field(default_factory=dict)


class ConditionOperand(BaseModel):
    """An operand on either side of a condition."""

    type: Literal["indicator", "price_field", "constant", "range"]
    indicator_id: str | None = None
    indicator_type: IndicatorType | None = None
    price_field: Literal["open", "high", "low", "close", "volume", "hl2", "hlc3"] | None = None
    constant_value: float | None = None
    range_min: float | None = None
    range_max: float | None = None
    offset: int = Field(default=0, ge=-50, le=0, description="Bar offset: 0 is current candle, -1 is previous")


class ConditionRule(BaseModel):
    """Atomic condition expression comparing two operands."""

    id: str = Field(default_factory=lambda: f"cond_{uuid4().hex[:8]}")
    left: ConditionOperand
    operator: ConditionOperator
    right: ConditionOperand
    description: str | None = None


class ConditionGroup(BaseModel):
    """Boolean combination of condition rules or nested groups."""

    id: str = Field(default_factory=lambda: f"grp_{uuid4().hex[:8]}")
    logic: Literal["AND", "OR"] = "AND"
    conditions: list[ConditionRule] = Field(default_factory=list)
    nested_groups: list[ConditionGroup] = Field(default_factory=list)


class ExitRulesSpec(BaseModel):
    """Exit and stop-loss logic."""

    stop_loss_pct: float | None = Field(default=None, ge=0.01, le=100.0)
    stop_loss_points: float | None = Field(default=None, ge=0.1)
    stop_loss_atr_multiplier: float | None = Field(default=None, ge=0.1, le=10.0)
    target_profit_pct: float | None = Field(default=None, ge=0.01, le=500.0)
    target_profit_points: float | None = Field(default=None, ge=0.1)
    trailing_stop_enabled: bool = False
    trailing_stop_trigger_pct: float | None = Field(default=None, ge=0.01)
    trailing_stop_step_pct: float | None = Field(default=None, ge=0.01)
    trailing_stop_atr_multiplier: float | None = Field(default=None, ge=0.1)
    intraday_auto_squareoff: str = Field(
        default="15:15 IST",
        description="Mandatory intraday squareoff (e.g. '15:15 IST' for NSE or '23:15 IST' for MCX)",
    )
    exit_on_opposite_signal: bool = True
    time_based_max_holding_bars: int | None = Field(default=None, ge=1)


class PositionSizingSpec(BaseModel):
    """Position sizing rules with transparent assumptions."""

    method: PositionSizingMethod = PositionSizingMethod.FIXED_CAPITAL
    value: float = Field(default=100000.0, ge=1.0)
    max_risk_per_trade_pct: float = Field(default=1.0, ge=0.05, le=10.0)
    allocation_capital_inr: float = Field(default=500000.0, ge=10000.0)


class RiskLimitsSpec(BaseModel):
    """Hard pre-trade risk controls enforced before execution."""

    max_capital_allocation_inr: float = Field(default=500000.0, ge=10000.0)
    max_open_positions: int = Field(default=3, ge=1, le=50)
    daily_loss_limit_inr: float = Field(default=15000.0, ge=500.0)
    max_order_quantity: int = Field(default=1800, ge=1)
    allowed_trading_days: list[str] = Field(default_factory=lambda: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
    prevent_duplicate_entries: bool = True
    entry_cooldown_bars: int = Field(default=3, ge=0, le=50)


class AdvancedExecutionSpec(BaseModel):
    """Market execution assumptions and statutory tax parameters."""

    slippage_pct: float = Field(default=0.05, ge=0.0, le=2.0)
    include_stt_ctt: bool = True
    include_exchange_turnover_charges: bool = True
    include_gst: bool = True
    brokerage_per_order_inr: float = Field(default=20.0, ge=0.0)


class StrategySpec(BaseModel):
    """Complete machine-readable trading strategy specification."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(min_length=3, max_length=150)
    description: str = Field(default="", max_length=2000)
    category: StrategyCategory = StrategyCategory.MOMENTUM
    exchange: Exchange = Exchange.NSE
    symbol: str = Field(min_length=1, max_length=30)
    timeframe: Timeframe = Timeframe.M15
    trading_session: str = Field(default="09:15-15:30 IST")

    # Core logic
    indicators: list[IndicatorSpec] = Field(default_factory=list)
    entry_rules: ConditionGroup = Field(default_factory=ConditionGroup)
    exit_rules: ExitRulesSpec = Field(default_factory=ExitRulesSpec)

    # Risk and Sizing
    position_sizing: PositionSizingSpec = Field(default_factory=PositionSizingSpec)
    risk_limits: RiskLimitsSpec = Field(default_factory=RiskLimitsSpec)
    execution_settings: AdvancedExecutionSpec = Field(default_factory=AdvancedExecutionSpec)

    # Lifecycle & Metadata
    lifecycle_state: StrategyLifecycleState = StrategyLifecycleState.DRAFT
    compiler_version: str = "1.0.0"

    @field_validator("trading_session", mode="before")
    @classmethod
    def set_default_trading_session(cls, v: str | None, values: Any) -> str:
        if v:
            return v
        return "09:15-15:30 IST"

    def compute_canonical_hash(self) -> str:
        """Calculate deterministic SHA-256 hash of specification for immutable versioning."""
        dumped = self.model_dump(mode="json", exclude={"id", "lifecycle_state"})
        canonical_str = json.dumps(dumped, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
