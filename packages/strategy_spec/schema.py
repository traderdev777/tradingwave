"""Typed Pydantic v2 Strategy Specification AST Schema for TradingWave.

Defines deterministic, machine-readable specifications for Indian market algorithmic strategies,
including Opening Range Breakout (ORB), multi-timeframe rules, independent exit timeframes,
Trailing Stop-Loss (TSL), and Intraday / BTST execution modes.
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
    M2 = "2m"
    M3 = "3m"
    M5 = "5m"
    M10 = "10m"
    M15 = "15m"
    M16 = "16m"
    M30 = "30m"
    M45 = "45m"
    H1 = "1h"
    M60 = "60m"
    D1 = "1d"


class TradingMode(str, Enum):
    INTRADAY = "INTRADAY"
    BTST = "BTST"


class StrategyDirection(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"
    BOTH = "BOTH"


class ConditionOperator(str, Enum):
    CROSSES_ABOVE = "CROSSES_ABOVE"
    CROSSES_BELOW = "CROSSES_BELOW"
    CROSSES_ABOVE_LEVEL = "CROSSES_ABOVE_LEVEL"
    CROSSES_BELOW_LEVEL = "CROSSES_BELOW_LEVEL"
    GREATER_THAN = "GREATER_THAN"
    LESS_THAN = "LESS_THAN"
    GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL"
    LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL"
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
    ORB = "ORB"
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


class BreakoutConfirmationMethod(str, Enum):
    CANDLE_CLOSE = "CANDLE_CLOSE"
    HIGH_LOW_PENETRATION = "HIGH_LOW_PENETRATION"
    RETEST_CONFIRMATION = "RETEST_CONFIRMATION"


class StopLossMethod(str, Enum):
    FIXED_POINTS = "FIXED_POINTS"
    PERCENTAGE = "PERCENTAGE"
    FIXED_CURRENCY = "FIXED_CURRENCY"
    ATR_BASED = "ATR_BASED"
    ORB_BASED = "ORB_BASED"
    PREV_CANDLE_HIGH_LOW = "PREV_CANDLE_HIGH_LOW"
    INDICATOR_BASED = "INDICATOR_BASED"
    CUSTOM_CONDITION = "CUSTOM_CONDITION"


class ProfitTargetMethod(str, Enum):
    FIXED_POINTS = "FIXED_POINTS"
    PERCENTAGE = "PERCENTAGE"
    RISK_REWARD_MULTIPLE = "RISK_REWARD_MULTIPLE"
    ORB_RANGE_MULTIPLE = "ORB_RANGE_MULTIPLE"
    INDICATOR_BASED = "INDICATOR_BASED"
    MULTIPLE_TARGETS = "MULTIPLE_TARGETS"


class TSLActivationType(str, Enum):
    POINTS = "POINTS"
    PERCENTAGE = "PERCENTAGE"
    R_MULTIPLE = "R_MULTIPLE"


class TSLDistanceType(str, Enum):
    POINTS = "POINTS"
    PERCENTAGE = "PERCENTAGE"
    ATR_MULTIPLIER = "ATR_MULTIPLIER"
    CANDLE_HIGH_LOW = "CANDLE_HIGH_LOW"
    STEP_BASED = "STEP_BASED"
    INDICATOR_BASED = "INDICATOR_BASED"


class ORBSettingsSpec(BaseModel):
    """Opening Range Breakout (ORB) parameters and session configuration."""

    enabled: bool = False
    range_start_time: str = Field(default="09:15", description="Start time of opening range (HH:MM)")
    range_end_time: str = Field(default="09:30", description="End time of opening range (HH:MM)")
    entry_start_time: str = Field(default="09:30", description="Earliest allowed entry time (HH:MM)")
    entry_cutoff_time: str = Field(default="14:30", description="Latest allowed entry time (HH:MM)")
    calculation_timeframe: Timeframe = Timeframe.M15
    first_candle_timeframe: Timeframe = Timeframe.M3
    confirmation_method: BreakoutConfirmationMethod = BreakoutConfirmationMethod.CANDLE_CLOSE
    breakout_buffer_pct: float = Field(default=0.0, ge=0.0, le=5.0, description="Buffer beyond ORB high/low to confirm breakout")
    one_entry_per_breakout: bool = True
    max_entries_per_session: int = Field(default=2, ge=1, le=10)
    range_basis: Literal["HIGH_LOW", "BODY_OPEN_CLOSE"] = "HIGH_LOW"
    allow_opposite_side_reentry: bool = False


class BTSTSettingsSpec(BaseModel):
    """Buy Today, Sell Tomorrow (BTST) overnight parameter specification."""

    enabled: bool = False
    entry_window_start: str = Field(default="15:00", description="Earliest BTST entry window on Day T (HH:MM)")
    entry_window_end: str = Field(default="15:25", description="Latest BTST entry window on Day T (HH:MM)")
    next_session_exit_start: str = Field(default="09:15", description="Earliest exit window on Day T+1 (HH:MM)")
    next_session_exit_cutoff: str = Field(default="09:30", description="Mandatory exit cutoff on Day T+1 (HH:MM)")
    gap_risk_acknowledged: bool = Field(default=True, description="Trader explicitly acknowledges overnight auction gap risk")
    squareoff_on_gap_breach: bool = True


class TSLSettingsSpec(BaseModel):
    """Configurable Trailing Stop-Loss (TSL) parameter specification."""

    enabled: bool = False
    activation_type: TSLActivationType = TSLActivationType.POINTS
    activation_value: float = Field(default=20.0, ge=0.01, description="Threshold to start trailing (points, % or R)")
    distance_type: TSLDistanceType = TSLDistanceType.POINTS
    distance_value: float = Field(default=10.0, ge=0.01, description="Trailing distance behind high/low water mark")
    step_value: float | None = Field(default=None, ge=0.01, description="Step increment for step-based trailing")
    atr_multiplier: float | None = Field(default=None, ge=0.1, le=10.0)
    update_timeframe: Timeframe = Timeframe.M1
    evaluation_candle_offset: int = Field(default=-1, ge=-50, le=0, description="Bar reference to evaluate TSL updates (e.g. -1 for completed candle)")
    lock_profit_at_activation: bool = True
    custom_exit_condition: str | None = None


class ProfitTargetLeg(BaseModel):
    """Individual target profit tier for staged or partial position exits."""

    target_number: int = Field(default=1, ge=1, le=5)
    target_pct: float | None = Field(default=None, ge=0.01)
    target_points: float | None = Field(default=None, ge=0.1)
    quantity_allocation_pct: float = Field(default=100.0, ge=1.0, le=100.0)


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
    price_field: Literal[
        "open",
        "high",
        "low",
        "close",
        "volume",
        "typical_price",
        "hl2",
        "hlc3",
        "orb_high",
        "orb_low",
        "orb_midpoint",
        "first_orb_candle_high",
        "first_orb_candle_low",
        "first_candle_high",
        "first_candle_low",
        "prev_candle_high",
        "prev_candle_low",
    ] | None = None
    constant_value: float | None = None
    range_min: float | None = None
    range_max: float | None = None
    timeframe: Timeframe | None = None
    offset: int = Field(default=0, ge=-50, le=0, description="Bar offset: 0 is current candle, -1 is previous, -2 is two ago")


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

    stop_loss_method: StopLossMethod = StopLossMethod.PERCENTAGE
    stop_loss_pct: float | None = Field(default=None, ge=0.01, le=100.0)
    stop_loss_points: float | None = Field(default=None, ge=0.1)
    stop_loss_atr_multiplier: float | None = Field(default=None, ge=0.1, le=10.0)
    orb_stop_buffer_pct: float | None = Field(default=None, ge=0.0)

    profit_target_method: ProfitTargetMethod = ProfitTargetMethod.PERCENTAGE
    target_profit_pct: float | None = Field(default=None, ge=0.01, le=500.0)
    target_profit_points: float | None = Field(default=None, ge=0.1)
    target_profit_rr_multiple: float | None = Field(default=None, ge=0.1)
    profit_target_legs: list[ProfitTargetLeg] = Field(default_factory=list)

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
    exit_conditions: ConditionGroup | None = None


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
    allowed_trading_days: list[str] = Field(
        default_factory=lambda: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    )
    prevent_duplicate_entries: bool = True
    entry_cooldown_bars: int = Field(default=3, ge=0, le=50)


class AdvancedExecutionSpec(BaseModel):
    """Market execution assumptions and statutory tax parameters."""

    slippage_pct: float = Field(default=0.05, ge=0.0, le=2.0)
    include_stt_ctt: bool = True
    include_exchange_turnover_charges: bool = True
    include_gst: bool = True
    brokerage_per_order_inr: float = Field(default=20.0, ge=0.0)


def _default_entry_rules() -> ConditionGroup:
    return ConditionGroup(
        conditions=[
            ConditionRule(
                left=ConditionOperand(type="price_field", price_field="close", offset=0),
                operator=ConditionOperator.CROSSES_ABOVE,
                right=ConditionOperand(type="constant", constant_value=100.0, offset=0),
                description="Default baseline close rule",
            )
        ]
    )


def create_orb_call_entry_rules(entry_tf: Timeframe = Timeframe.M1) -> ConditionGroup:
    """Create canonical CALL entry multi-group rules: (A1 AND A2) OR (B1 AND B2).

    Group A:
      A1: candle reference -2, source Close < Opening Range High
      A2: candle reference -1, source Close > Opening Range High
    Group B:
      B1: candle reference -2, source Close < Opening Range Low
      B2: candle reference -1, source Close > Opening Range Low
    """
    grp_a = ConditionGroup(
        id=f"grp_call_a_{uuid4().hex[:6]}",
        logic="AND",
        conditions=[
            ConditionRule(
                id=f"rule_call_a1_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-2, timeframe=entry_tf),
                operator=ConditionOperator.LESS_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_high", offset=0),
                description="Candle -2 Close < ORB High",
            ),
            ConditionRule(
                id=f"rule_call_a2_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1, timeframe=entry_tf),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_high", offset=0),
                description="Candle -1 Close > ORB High",
            ),
        ],
    )
    grp_b = ConditionGroup(
        id=f"grp_call_b_{uuid4().hex[:6]}",
        logic="AND",
        conditions=[
            ConditionRule(
                id=f"rule_call_b1_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-2, timeframe=entry_tf),
                operator=ConditionOperator.LESS_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_low", offset=0),
                description="Candle -2 Close < ORB Low",
            ),
            ConditionRule(
                id=f"rule_call_b2_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1, timeframe=entry_tf),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_low", offset=0),
                description="Candle -1 Close > ORB Low",
            ),
        ],
    )
    return ConditionGroup(
        id=f"grp_call_entry_root_{uuid4().hex[:6]}",
        logic="OR",
        conditions=[],
        nested_groups=[grp_a, grp_b],
    )


def create_orb_put_entry_rules(entry_tf: Timeframe = Timeframe.M1) -> ConditionGroup:
    """Create canonical PUT entry multi-group rules: (A1 AND A2) OR (B1 AND B2).

    Group A (Inverse):
      A1: candle reference -2, source Close > Opening Range Low
      A2: candle reference -1, source Close < Opening Range Low
    Group B (Inverse):
      B1: candle reference -2, source Close > Opening Range High
      B2: candle reference -1, source Close < Opening Range High
    """
    grp_a = ConditionGroup(
        id=f"grp_put_a_{uuid4().hex[:6]}",
        logic="AND",
        conditions=[
            ConditionRule(
                id=f"rule_put_a1_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-2, timeframe=entry_tf),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_low", offset=0),
                description="Candle -2 Close > ORB Low",
            ),
            ConditionRule(
                id=f"rule_put_a2_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1, timeframe=entry_tf),
                operator=ConditionOperator.LESS_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_low", offset=0),
                description="Candle -1 Close < ORB Low",
            ),
        ],
    )
    grp_b = ConditionGroup(
        id=f"grp_put_b_{uuid4().hex[:6]}",
        logic="AND",
        conditions=[
            ConditionRule(
                id=f"rule_put_b1_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-2, timeframe=entry_tf),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_high", offset=0),
                description="Candle -2 Close > ORB High",
            ),
            ConditionRule(
                id=f"rule_put_b2_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1, timeframe=entry_tf),
                operator=ConditionOperator.LESS_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_high", offset=0),
                description="Candle -1 Close < ORB High",
            ),
        ],
    )
    return ConditionGroup(
        id=f"grp_put_entry_root_{uuid4().hex[:6]}",
        logic="OR",
        conditions=[],
        nested_groups=[grp_a, grp_b],
    )


def create_orb_call_exit_rules(exit_tf: Timeframe = Timeframe.M1) -> ConditionGroup:
    """Create default CALL exit rule group."""
    grp_exit = ConditionGroup(
        id=f"grp_call_exit_{uuid4().hex[:6]}",
        logic="AND",
        conditions=[
            ConditionRule(
                id=f"rule_call_exit_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1, timeframe=exit_tf),
                operator=ConditionOperator.LESS_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_midpoint", offset=0),
                description="Candle -1 Close < ORB Midpoint",
            )
        ],
    )
    return ConditionGroup(
        id=f"grp_call_exit_root_{uuid4().hex[:6]}",
        logic="OR",
        conditions=[],
        nested_groups=[grp_exit],
    )


def create_orb_put_exit_rules(exit_tf: Timeframe = Timeframe.M1) -> ConditionGroup:
    """Create default PUT exit rule group."""
    grp_exit = ConditionGroup(
        id=f"grp_put_exit_{uuid4().hex[:6]}",
        logic="AND",
        conditions=[
            ConditionRule(
                id=f"rule_put_exit_{uuid4().hex[:6]}",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1, timeframe=exit_tf),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_midpoint", offset=0),
                description="Candle -1 Close > ORB Midpoint",
            )
        ],
    )
    return ConditionGroup(
        id=f"grp_put_exit_root_{uuid4().hex[:6]}",
        logic="OR",
        conditions=[],
        nested_groups=[grp_exit],
    )


class StrategySpec(BaseModel):
    """Complete machine-readable trading strategy specification."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(min_length=3, max_length=150)
    description: str = Field(default="", max_length=2000)
    category: StrategyCategory = StrategyCategory.MOMENTUM
    exchange: Exchange = Exchange.NSE
    symbol: str = Field(min_length=1, max_length=30)
    timeframe: Timeframe = Timeframe.M15
    entry_timeframe: Timeframe = Timeframe.M5
    exit_timeframe: Timeframe = Timeframe.M1
    trading_mode: TradingMode = TradingMode.INTRADAY
    direction: StrategyDirection = StrategyDirection.BOTH
    trading_session: str = Field(default="09:15-15:30 IST")

    # Specialized Strategy Modules
    orb_settings: ORBSettingsSpec = Field(default_factory=ORBSettingsSpec)
    btst_settings: BTSTSettingsSpec = Field(default_factory=BTSTSettingsSpec)
    tsl_settings: TSLSettingsSpec = Field(default_factory=TSLSettingsSpec)

    # Core logic: General, CALL, and PUT rule trees
    indicators: list[IndicatorSpec] = Field(default_factory=list)
    entry_rules: ConditionGroup = Field(default_factory=_default_entry_rules)
    exit_rules: ExitRulesSpec = Field(default_factory=ExitRulesSpec)

    call_entry_rules: ConditionGroup | None = None
    put_entry_rules: ConditionGroup | None = None
    call_exit_rules: ConditionGroup | None = None
    put_exit_rules: ConditionGroup | None = None

    # Risk and Sizing
    position_sizing: PositionSizingSpec = Field(default_factory=PositionSizingSpec)
    risk_limits: RiskLimitsSpec = Field(default_factory=RiskLimitsSpec)
    execution_settings: AdvancedExecutionSpec = Field(default_factory=AdvancedExecutionSpec)

    # Lifecycle & Metadata
    lifecycle_state: StrategyLifecycleState = StrategyLifecycleState.DRAFT
    compiler_version: str = "1.1.0"

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
