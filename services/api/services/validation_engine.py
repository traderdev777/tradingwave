"""Deterministic Validation Engine for TradingWave Strategy Specifications.

Performs static analysis and pre-flight validation independent of the LLM.
Validates Opening Range Breakout (ORB) time boundaries, multi-timeframe alignment,
lookahead bias prevention, BTST vs Intraday session rules, Trailing Stop-Loss (TSL)
consistency, and regulatory safety limits.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from packages.strategy_spec.schema import (
    BreakoutConfirmationMethod,
    ConditionGroup,
    ConditionOperator,
    ConditionRule,
    Exchange,
    IndicatorType,
    StrategyCategory,
    StrategySpec,
    Timeframe,
    TradingMode,
)


class ValidationSeverity(str, Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class ValidationIssue(BaseModel):
    """An individual static analysis issue or sanity diagnostic."""

    severity: ValidationSeverity
    code: str
    message: str
    affected_field: str
    suggested_correction: str
    blocks_testing: bool = False


class ValidationReport(BaseModel):
    """Aggregated validation report for a strategy specification."""

    is_valid: bool
    can_backtest: bool
    can_paper_trade: bool
    error_count: int
    warning_count: int
    info_count: int
    issues: list[ValidationIssue] = Field(default_factory=list)
    explanation: str


class StrategyValidationEngine:
    """Deterministic, rule-based static analyzer for quantitative strategy specifications."""

    VALID_NSE_SYMBOLS = {"NIFTY50", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"}
    VALID_MCX_SYMBOLS = {"CRUDEOIL", "GOLDM", "SILVERM", "NATURALGAS", "COPPER", "ZINC"}

    TIMEFRAME_MINUTES = {
        Timeframe.M1: 1,
        Timeframe.M2: 2,
        Timeframe.M3: 3,
        Timeframe.M5: 5,
        Timeframe.M10: 10,
        Timeframe.M15: 15,
        Timeframe.M16: 16,
        Timeframe.M30: 30,
        Timeframe.M45: 45,
        Timeframe.H1: 60,
        Timeframe.M60: 60,
        Timeframe.D1: 1440,
    }

    @staticmethod
    def _parse_time_hhmm(val: str) -> tuple[int, int] | None:
        """Extract (hour, minute) integer tuple from HH:MM string."""
        m = re.search(r"(\d{1,2}):(\d{2})", val)
        if m:
            return int(m.group(1)), int(m.group(2))
        return None

    @classmethod
    def validate(cls, spec: StrategySpec) -> ValidationReport:
        issues: list[ValidationIssue] = []

        # 1. Identity & Naming
        if not spec.name or len(spec.name.strip()) < 3:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_STRATEGY_NAME",
                    message="Strategy name must be at least 3 characters long.",
                    affected_field="name",
                    suggested_correction="Provide a descriptive strategy title.",
                    blocks_testing=True,
                )
            )

        # 2. Exchange & Instrument Mapping
        norm_symbol = spec.symbol.strip().upper().replace(" ", "")
        if spec.exchange == Exchange.MCX:
            if norm_symbol in cls.VALID_NSE_SYMBOLS or any(k in norm_symbol for k in ["NIFTY", "RELIANCE", "TCS", "INFY"]):
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="INSTRUMENT_EXCHANGE_MISMATCH",
                        message=f"Equity / Index contract '{spec.symbol}' cannot be traded on MCX. Use NSE or BSE.",
                        affected_field="exchange",
                        suggested_correction="Select NSE or BSE for equity index contracts.",
                        blocks_testing=True,
                    )
                )
            elif norm_symbol not in cls.VALID_MCX_SYMBOLS and not any(k in norm_symbol for k in ["CRUDE", "GOLD", "SILVER", "GAS"]):
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        code="UNRECOGNIZED_MCX_SYMBOL",
                        message=f"'{spec.symbol}' is not a recognized MCX commodity futures contract.",
                        affected_field="symbol",
                        suggested_correction="Select a standard MCX contract like CRUDEOIL, GOLDM, or NATURALGAS.",
                        blocks_testing=False,
                    )
                )

            # Check MCX trading session
            if "09:00" not in spec.trading_session and "23:30" not in spec.trading_session:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="MCX_SESSION_MISMATCH",
                        message=f"MCX operates evening sessions (09:00 - 23:30 IST). Configured session '{spec.trading_session}' is invalid.",
                        affected_field="trading_session",
                        suggested_correction="Update trading session to '09:00-23:30 IST'.",
                        blocks_testing=True,
                    )
                )
        elif spec.exchange in (Exchange.NSE, Exchange.BSE):
            if norm_symbol in cls.VALID_MCX_SYMBOLS or any(k in norm_symbol for k in ["CRUDE", "GOLD", "SILVER", "NATURALGAS", "COPPER", "ZINC"]):
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="INSTRUMENT_EXCHANGE_MISMATCH",
                        message=f"Commodity contract '{spec.symbol}' cannot be traded on {spec.exchange.value}. Use MCX.",
                        affected_field="exchange",
                        suggested_correction="Select MCX for commodity futures contracts.",
                        blocks_testing=True,
                    )
                )

            if "15:30" not in spec.trading_session and spec.trading_mode == TradingMode.INTRADAY:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        code="NSE_SESSION_MISMATCH",
                        message="Standard NSE equity & F&O cash session is 09:15 - 15:30 IST.",
                        affected_field="trading_session",
                        suggested_correction="Align trading session to '09:15-15:30 IST'.",
                        blocks_testing=False,
                    )
                )

        # 3. Opening Range Breakout (ORB) Validation
        if spec.orb_settings.enabled or spec.category == StrategyCategory.ORB:
            cls._validate_orb_settings(spec, issues)

        # 4. BTST (Buy Today, Sell Tomorrow) vs Intraday Mode Validation
        if spec.trading_mode == TradingMode.BTST or spec.btst_settings.enabled:
            cls._validate_btst_settings(spec, issues)

        # 5. Trailing Stop-Loss (TSL) Engine Validation
        if spec.tsl_settings.enabled or spec.exit_rules.trailing_stop_enabled:
            cls._validate_tsl_settings(spec, issues)

        # 6. Lookahead Bias & Bar Offsets Analysis (All Entry & Exit condition trees)
        cls._check_lookahead_bias(spec.entry_rules, issues, group_name="entry_rules")
        if spec.call_entry_rules:
            cls._check_lookahead_bias(spec.call_entry_rules, issues, group_name="call_entry_rules")
        if spec.put_entry_rules:
            cls._check_lookahead_bias(spec.put_entry_rules, issues, group_name="put_entry_rules")
        if spec.call_exit_rules:
            cls._check_lookahead_bias(spec.call_exit_rules, issues, group_name="call_exit_rules")
        if spec.put_exit_rules:
            cls._check_lookahead_bias(spec.put_exit_rules, issues, group_name="put_exit_rules")
        if spec.exit_rules.exit_conditions:
            cls._check_lookahead_bias(spec.exit_rules.exit_conditions, issues, group_name="exit_rules.exit_conditions")

        # 7. Multi-Timeframe Alignment & Repainting Bias
        cls._check_higher_timeframe_alignment(spec, issues)

        # 8. Indicators Sanity Check
        for ind in spec.indicators:
            cls._validate_indicator(ind, spec, issues)

        # 9. Entry Rules Existence (either entry_rules, call_entry_rules, or put_entry_rules must have rules)
        has_general_entry = bool(spec.entry_rules.conditions or spec.entry_rules.nested_groups)
        has_call_entry = bool(spec.call_entry_rules and (spec.call_entry_rules.conditions or spec.call_entry_rules.nested_groups))
        has_put_entry = bool(spec.put_entry_rules and (spec.put_entry_rules.conditions or spec.put_entry_rules.nested_groups))

        if not (has_general_entry or has_call_entry or has_put_entry):
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="EMPTY_ENTRY_RULES",
                    message="Strategy must specify at least one entry condition rule in general, CALL, or PUT entry trees.",
                    affected_field="entry_rules",
                    suggested_correction="Add at least one entry rule (e.g. ORB breakout, EMA crossover, or RSI filter).",
                    blocks_testing=True,
                )
            )

        # 10. Contradictory & Malformed Conditions
        cls._check_contradictory_conditions(spec.entry_rules, issues)
        if spec.call_entry_rules:
            cls._check_contradictory_conditions(spec.call_entry_rules, issues)
        if spec.put_entry_rules:
            cls._check_contradictory_conditions(spec.put_entry_rules, issues)

        # 11. Exit Rules & Stop-Loss Sanity
        if (
            spec.exit_rules.stop_loss_pct is None
            and spec.exit_rules.stop_loss_points is None
            and spec.exit_rules.stop_loss_atr_multiplier is None
            and not spec.tsl_settings.enabled
            and spec.exit_rules.orb_stop_buffer_pct is None
        ):
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="UNBOUNDED_STOP_LOSS",
                    message="No explicit Stop Loss defined. Strategy exposed to severe tail risk in volatile opening gap-downs.",
                    affected_field="exit_rules.stop_loss_pct",
                    suggested_correction="Configure a stop loss (e.g. 0.5% - 1.5%, 20 points, 1.5× ATR, or ORB low).",
                    blocks_testing=False,
                )
            )

        if spec.exit_rules.stop_loss_pct is not None and spec.exit_rules.stop_loss_pct <= 0:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_STOP_LOSS",
                    message=f"Stop loss percentage ({spec.exit_rules.stop_loss_pct}%) must be greater than zero.",
                    affected_field="exit_rules.stop_loss_pct",
                    suggested_correction="Set a positive stop loss percentage (e.g. 0.5% or 1.0%).",
                    blocks_testing=True,
                )
            )

        if spec.exit_rules.target_profit_pct is not None and spec.exit_rules.target_profit_pct <= 0:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_TARGET_PROFIT",
                    message=f"Target profit percentage ({spec.exit_rules.target_profit_pct}%) must be greater than zero.",
                    affected_field="exit_rules.target_profit_pct",
                    suggested_correction="Set a positive target profit percentage (e.g. 1.5% or 2.0%).",
                    blocks_testing=True,
                )
            )

        # Multi-Target Leg Allocation Sum
        if spec.exit_rules.profit_target_legs:
            total_alloc = sum(leg.quantity_allocation_pct for leg in spec.exit_rules.profit_target_legs)
            if total_alloc > 100.0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="EXCESS_TARGET_ALLOCATION",
                        message=f"Combined profit target allocations ({total_alloc}%) exceed total open position (100%).",
                        affected_field="exit_rules.profit_target_legs",
                        suggested_correction="Ensure sum of partial target allocations does not exceed 100%.",
                        blocks_testing=True,
                    )
                )

        if spec.exit_rules.stop_loss_pct and spec.exit_rules.target_profit_pct:
            if spec.exit_rules.stop_loss_pct >= spec.exit_rules.target_profit_pct * 3.0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        code="POOR_RISK_REWARD_RATIO",
                        message=f"Stop loss ({spec.exit_rules.stop_loss_pct}%) is greater than 3× target ({spec.exit_rules.target_profit_pct}%). Negative risk:reward profile.",
                        affected_field="exit_rules.stop_loss_pct",
                        suggested_correction="Aim for at least a 1:1.5 or 1:2 risk-to-reward ratio.",
                        blocks_testing=False,
                    )
                )

        # Intraday square-off sanity (Only for INTRADAY mode)
        if spec.trading_mode == TradingMode.INTRADAY:
            sq_time = cls._parse_time_hhmm(spec.exit_rules.intraday_auto_squareoff)
            if sq_time:
                hh, mm = sq_time
                if spec.exchange in (Exchange.NSE, Exchange.BSE):
                    if hh > 15 or (hh == 15 and mm > 30):
                        issues.append(
                            ValidationIssue(
                                severity=ValidationSeverity.ERROR,
                                code="INVALID_SQUAREOFF_TIME",
                                message=f"Intraday auto square-off '{spec.exit_rules.intraday_auto_squareoff}' is scheduled after cash market session close (15:30 IST).",
                                affected_field="exit_rules.intraday_auto_squareoff",
                                suggested_correction="Set intraday auto square-off to 15:15 IST or earlier.",
                                blocks_testing=True,
                            )
                        )
                elif spec.exchange == Exchange.MCX:
                    if "15:15" in spec.exit_rules.intraday_auto_squareoff:
                        issues.append(
                            ValidationIssue(
                                severity=ValidationSeverity.WARNING,
                                code="EARLY_MCX_SQUAREOFF",
                                message="Intraday square-off at 15:15 IST cuts off peak MCX evening trading hours (17:00 - 23:30 IST).",
                                affected_field="exit_rules.intraday_auto_squareoff",
                                suggested_correction="Set MCX auto square-off to '23:15 IST'.",
                                blocks_testing=False,
                            )
                        )
                    elif hh > 23 or (hh == 23 and mm > 30):
                        issues.append(
                            ValidationIssue(
                                severity=ValidationSeverity.ERROR,
                                code="INVALID_SQUAREOFF_TIME",
                                message=f"Intraday auto square-off '{spec.exit_rules.intraday_auto_squareoff}' is scheduled after MCX session close (23:30 IST).",
                                affected_field="exit_rules.intraday_auto_squareoff",
                                suggested_correction="Set MCX auto square-off to 23:15 IST.",
                                blocks_testing=True,
                            )
                        )

        # 12. Position Sizing Bounds
        if spec.position_sizing.value <= 0:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_POSITION_SIZING",
                    message="Position sizing value must be greater than zero.",
                    affected_field="position_sizing.value",
                    suggested_correction="Set a positive allocation value (e.g. ₹100,000 or fixed quantity).",
                    blocks_testing=True,
                )
            )

        if spec.position_sizing.allocation_capital_inr <= 0:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_ALLOCATION_CAPITAL",
                    message="Total allocation capital must be greater than zero.",
                    affected_field="position_sizing.allocation_capital_inr",
                    suggested_correction="Set allocation capital to at least ₹10,000.",
                    blocks_testing=True,
                )
            )

        if spec.position_sizing.max_risk_per_trade_pct <= 0:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_MAX_RISK_PER_TRADE",
                    message="Maximum risk per trade percentage must be greater than zero.",
                    affected_field="position_sizing.max_risk_per_trade_pct",
                    suggested_correction="Set risk per trade between 0.5% and 2.0%.",
                    blocks_testing=True,
                )
            )

        # 13. Pre-Trade Risk Controls
        if spec.risk_limits.daily_loss_limit_inr <= 0:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_DAILY_LOSS_LIMIT",
                    message="Daily loss circuit limit must be greater than zero.",
                    affected_field="risk_limits.daily_loss_limit_inr",
                    suggested_correction="Set a hard daily loss circuit (e.g. ₹15,000).",
                    blocks_testing=True,
                )
            )

        if spec.risk_limits.max_open_positions <= 0:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_MAX_POSITIONS",
                    message="Maximum open positions must be at least 1.",
                    affected_field="risk_limits.max_open_positions",
                    suggested_correction="Allow at least 1 concurrent open position.",
                    blocks_testing=True,
                )
            )

        if spec.risk_limits.max_order_quantity <= 0:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_MAX_ORDER_QUANTITY",
                    message="Maximum order quantity must be at least 1.",
                    affected_field="risk_limits.max_order_quantity",
                    suggested_correction="Set a valid maximum order quantity limit.",
                    blocks_testing=True,
                )
            )

        # 14. Statutory Taxes Informational
        issues.append(
            ValidationIssue(
                severity=ValidationSeverity.INFO,
                code="STATUTORY_TAXES_APPLIED",
                message=f"Deterministic simulation incorporates statutory {'CTT' if spec.exchange == Exchange.MCX else 'STT'}, GST (18%), exchange turnover fees, and ₹20/order brokerage.",
                affected_field="execution_settings",
                suggested_correction="All simulated metrics reflect net post-tax P&L.",
                blocks_testing=False,
            )
        )

        error_count = sum(1 for i in issues if i.severity == ValidationSeverity.ERROR)
        warning_count = sum(1 for i in issues if i.severity == ValidationSeverity.WARNING)
        info_count = sum(1 for i in issues if i.severity == ValidationSeverity.INFO)
        can_backtest = error_count == 0

        explanation = (
            "Specification passed all deterministic sanity checks, ORB timing bounds, and risk controls."
            if can_backtest
            else f"Specification has {error_count} blocking error(s) that must be resolved before backtesting."
        )

        return ValidationReport(
            is_valid=can_backtest,
            can_backtest=can_backtest,
            can_paper_trade=can_backtest,
            error_count=error_count,
            warning_count=warning_count,
            info_count=info_count,
            issues=issues,
            explanation=explanation,
        )

    @classmethod
    def _validate_orb_settings(cls, spec: StrategySpec, issues: list[ValidationIssue]) -> None:
        """Validate opening range start, end, entry start, and cutoff timing sequence."""
        orb = spec.orb_settings
        r_start = cls._parse_time_hhmm(orb.range_start_time)
        r_end = cls._parse_time_hhmm(orb.range_end_time)
        e_start = cls._parse_time_hhmm(orb.entry_start_time)
        e_cutoff = cls._parse_time_hhmm(orb.entry_cutoff_time)

        if not r_start or not r_end:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_ORB_TIME_FORMAT",
                    message="Opening range start and end times must be valid 'HH:MM' timestamps.",
                    affected_field="orb_settings.range_start_time",
                    suggested_correction="Use 24-hour format like '09:15' and '09:30'.",
                    blocks_testing=True,
                )
            )
            return

        if r_start >= r_end:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_ORB_RANGE_WINDOW",
                    message=f"Opening range start time ({orb.range_start_time}) must precede range end time ({orb.range_end_time}).",
                    affected_field="orb_settings.range_start_time",
                    suggested_correction="Set range window like 09:15 - 09:30 or 09:15 - 09:45.",
                    blocks_testing=True,
                )
            )

        if e_start and e_start < r_end:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="ORB_ENTRY_BEFORE_RANGE_COMPLETION",
                    message=(
                        f"Entry start time ({orb.entry_start_time}) cannot begin before the opening range "
                        f"is complete ({orb.range_end_time}). Breaks deterministic breakout logic."
                    ),
                    affected_field="orb_settings.entry_start_time",
                    suggested_correction=f"Set entry start time to at or after {orb.range_end_time}.",
                    blocks_testing=True,
                )
            )

        if e_cutoff and e_start and e_cutoff <= e_start:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_ORB_ENTRY_CUTOFF",
                    message=f"Entry cutoff time ({orb.entry_cutoff_time}) must be later than entry start time ({orb.entry_start_time}).",
                    affected_field="orb_settings.entry_cutoff_time",
                    suggested_correction="Set entry cutoff time to typical window like 14:30 or 15:00.",
                    blocks_testing=True,
                )
            )

        # Check cutoff does not exceed intraday square-off
        if spec.trading_mode == TradingMode.INTRADAY and e_cutoff:
            sq_time = cls._parse_time_hhmm(spec.exit_rules.intraday_auto_squareoff)
            if sq_time and e_cutoff > sq_time:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="ORB_CUTOFF_AFTER_SQUAREOFF",
                        message=(
                            f"ORB entry cutoff ({orb.entry_cutoff_time}) cannot be later than mandatory "
                            f"intraday auto square-off ({spec.exit_rules.intraday_auto_squareoff})."
                        ),
                        affected_field="orb_settings.entry_cutoff_time",
                        suggested_correction="Schedule entry cutoff before square-off.",
                        blocks_testing=True,
                    )
                )

    @classmethod
    def _validate_btst_settings(cls, spec: StrategySpec, issues: list[ValidationIssue]) -> None:
        """Validate Buy Today, Sell Tomorrow (BTST) timing and overnight risk acknowledgement."""
        btst = spec.btst_settings
        e_start = cls._parse_time_hhmm(btst.entry_window_start)
        e_end = cls._parse_time_hhmm(btst.entry_window_end)
        x_start = cls._parse_time_hhmm(btst.next_session_exit_start)
        x_cutoff = cls._parse_time_hhmm(btst.next_session_exit_cutoff)

        if e_start and e_end and e_start >= e_end:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_BTST_ENTRY_WINDOW",
                    message=f"BTST entry start ({btst.entry_window_start}) must precede entry end ({btst.entry_window_end}).",
                    affected_field="btst_settings.entry_window_start",
                    suggested_correction="Set BTST entry window to late session like 15:00 - 15:25.",
                    blocks_testing=True,
                )
            )

        if x_start and x_cutoff and x_start >= x_cutoff:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="INVALID_BTST_EXIT_WINDOW",
                    message=f"BTST next-session exit start ({btst.next_session_exit_start}) must precede exit cutoff ({btst.next_session_exit_cutoff}).",
                    affected_field="btst_settings.next_session_exit_start",
                    suggested_correction="Set next-session exit window like 09:15 - 09:30.",
                    blocks_testing=True,
                )
            )

        # BTST requires overnight holding: Intraday 15:15 squareoff must be disabled
        if "15:15" in spec.exit_rules.intraday_auto_squareoff and spec.trading_mode == TradingMode.BTST:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="BTST_INTRADAY_SQUAREOFF_CONFLICT",
                    message="BTST strategies carry positions overnight. Intraday 15:15 IST square-off conflicts with BTST holding.",
                    affected_field="exit_rules.intraday_auto_squareoff",
                    suggested_correction="Set auto square-off to 'OVERNIGHT_BTST' or select Intraday mode.",
                    blocks_testing=True,
                )
            )

        # Gap Risk Acknowledgement
        if not btst.gap_risk_acknowledged:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="BTST_GAP_RISK_NOT_ACKNOWLEDGED",
                    message="BTST strategies require explicit acknowledgement of opening auction gap risk.",
                    affected_field="btst_settings.gap_risk_acknowledged",
                    suggested_correction="Acknowledge overnight gap risk before testing BTST.",
                    blocks_testing=True,
                )
            )

    @classmethod
    def _validate_tsl_settings(cls, spec: StrategySpec, issues: list[ValidationIssue]) -> None:
        """Validate Trailing Stop-Loss parameters and lookahead constraints."""
        tsl = spec.tsl_settings
        if tsl.enabled:
            if tsl.activation_value <= 0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="INVALID_TSL_ACTIVATION",
                        message="TSL activation threshold must be greater than zero.",
                        affected_field="tsl_settings.activation_value",
                        suggested_correction="Set positive activation value (e.g. 20 points or 0.75%).",
                        blocks_testing=True,
                    )
                )

            if tsl.distance_value <= 0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="INVALID_TSL_DISTANCE",
                        message="TSL trailing distance must be greater than zero.",
                        affected_field="tsl_settings.distance_value",
                        suggested_correction="Set positive trailing distance (e.g. 10 points or 0.5%).",
                        blocks_testing=True,
                    )
                )

            if tsl.evaluation_candle_offset > 0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="TSL_LOOKAHEAD_BIAS",
                        message="TSL evaluation candle offset cannot reference future bars (offset > 0).",
                        affected_field="tsl_settings.evaluation_candle_offset",
                        suggested_correction="Use offset 0 for intrabar or -1 for completed candle.",
                        blocks_testing=True,
                    )
                )

    @classmethod
    def _check_lookahead_bias(cls, group: ConditionGroup, issues: list[ValidationIssue], group_name: str = "entry_rules") -> None:
        """Inspect condition operands for future-data offsets (offset > 0)."""
        for cond in group.conditions:
            if cond.left.offset > 0 or cond.right.offset > 0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="LOOKAHEAD_BIAS_DETECTED",
                        message=f"Condition '{cond.description or cond.id}' in {group_name} references future bar (offset > 0). Lookahead bias prohibited.",
                        affected_field=group_name,
                        suggested_correction="Use offset 0 for current candle or negative offset (-1, -2) for closed bars.",
                        blocks_testing=True,
                    )
                )
        for nested in group.nested_groups:
            cls._check_lookahead_bias(nested, issues, group_name)

    @classmethod
    def _check_higher_timeframe_alignment(cls, spec: StrategySpec, issues: list[ValidationIssue]) -> None:
        """Check for higher timeframe indicators referenced with offset 0 causing intrabar repainting."""
        base_mins = cls.TIMEFRAME_MINUTES.get(spec.timeframe, 15)
        htf_indicators = {
            ind.id: ind
            for ind in spec.indicators
            if ind.timeframe and cls.TIMEFRAME_MINUTES.get(ind.timeframe, 0) > base_mins
        }
        if not htf_indicators:
            return

        def inspect_group(group: ConditionGroup, grp_label: str) -> None:
            for cond in group.conditions:
                for op in (cond.left, cond.right):
                    if op.indicator_id and op.indicator_id in htf_indicators and op.offset == 0:
                        ind = htf_indicators[op.indicator_id]
                        issues.append(
                            ValidationIssue(
                                severity=ValidationSeverity.ERROR,
                                code="HIGHER_TIMEFRAME_REPAINTING_RISK",
                                message=(
                                    f"Indicator '{ind.id}' on higher timeframe ({ind.timeframe.value}) is referenced with "
                                    f"offset 0 on strategy timeframe ({spec.timeframe.value}). This causes intrabar lookahead "
                                    "repainting. Use offset -1 for confirmed closed bar."
                                ),
                                affected_field=grp_label,
                                suggested_correction="Set condition operand offset to -1 for higher-timeframe data.",
                                blocks_testing=True,
                            )
                        )
            for nested in group.nested_groups:
                inspect_group(nested, grp_label)

        inspect_group(spec.entry_rules, "entry_rules")
        if spec.call_entry_rules:
            inspect_group(spec.call_entry_rules, "call_entry_rules")
        if spec.put_entry_rules:
            inspect_group(spec.put_entry_rules, "put_entry_rules")
        if spec.call_exit_rules:
            inspect_group(spec.call_exit_rules, "call_exit_rules")
        if spec.put_exit_rules:
            inspect_group(spec.put_exit_rules, "put_exit_rules")
        if spec.exit_rules.exit_conditions:
            inspect_group(spec.exit_rules.exit_conditions, "exit_rules.exit_conditions")

    @classmethod
    def _validate_indicator(cls, ind: Any, spec: StrategySpec, issues: list[ValidationIssue]) -> None:
        """Check indicator parameters against financial standard bounds."""
        if ind.type in (IndicatorType.EMA, IndicatorType.SMA):
            if ind.period < 1 or ind.period > 500:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="INVALID_MA_PERIOD",
                        message=f"Moving average period {ind.period} is out of bounds (1 to 500).",
                        affected_field="indicators",
                        suggested_correction="Set a typical period like 9, 20, 50, or 200.",
                        blocks_testing=True,
                    )
                )
        elif ind.type == IndicatorType.RSI:
            if ind.period < 2 or ind.period > 100:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="INVALID_RSI_PERIOD",
                        message=f"RSI period {ind.period} is out of bounds (2 to 100).",
                        affected_field="indicators",
                        suggested_correction="Set standard RSI period (typically 14).",
                        blocks_testing=True,
                    )
                )
        elif ind.type == IndicatorType.SUPERTREND:
            if ind.multiplier is not None and (ind.multiplier < 0.5 or ind.multiplier > 10.0):
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        code="EXTREME_SUPERTREND_MULTIPLIER",
                        message=f"Supertrend multiplier {ind.multiplier} is unusual. Typical institutional range is 1.5 to 4.0.",
                        affected_field="indicators",
                        suggested_correction="Use standard multiplier (e.g. 2.0 or 3.0).",
                        blocks_testing=False,
                    )
                )

    @classmethod
    def _check_contradictory_conditions(cls, group: ConditionGroup, issues: list[ValidationIssue]) -> None:
        """Detect logical contradictions like RSI > 70 AND RSI < 30 or opposing crosses on same bar."""
        if group.logic == "AND":
            rsi_greater = None
            rsi_less = None
            for c in group.conditions:
                if c.left.indicator_type == IndicatorType.RSI and c.right.constant_value is not None:
                    if c.operator == ConditionOperator.GREATER_THAN:
                        rsi_greater = c.right.constant_value
                    elif c.operator == ConditionOperator.LESS_THAN:
                        rsi_less = c.right.constant_value

            if rsi_greater is not None and rsi_less is not None and rsi_greater > rsi_less:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="CONTRADICTORY_RSI_RULES",
                        message=f"Logical contradiction: RSI cannot simultaneously be > {rsi_greater} AND < {rsi_less} on the same candle.",
                        affected_field="entry_rules",
                        suggested_correction="Change grouping logic to OR or adjust threshold boundaries.",
                        blocks_testing=True,
                    )
                )

            cross_above_pairs = set()
            cross_below_pairs = set()
            for c in group.conditions:
                pair_key = (
                    c.left.type,
                    c.left.indicator_id or c.left.price_field or c.left.constant_value,
                    c.right.type,
                    c.right.indicator_id or c.right.price_field or c.right.constant_value,
                )
                if c.operator in (ConditionOperator.CROSSES_ABOVE, ConditionOperator.CROSSES_ABOVE_LEVEL):
                    cross_above_pairs.add(pair_key)
                elif c.operator in (ConditionOperator.CROSSES_BELOW, ConditionOperator.CROSSES_BELOW_LEVEL):
                    cross_below_pairs.add(pair_key)

            contradictory = cross_above_pairs.intersection(cross_below_pairs)
            if contradictory:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="CONTRADICTORY_SIGNALS",
                        message="Logical contradiction: Condition group requires both CROSSES_ABOVE and CROSSES_BELOW on the same candle.",
                        affected_field="entry_rules",
                        suggested_correction="Remove conflicting crossover conditions or place them in an OR group.",
                        blocks_testing=True,
                    )
                )

        for nested in group.nested_groups:
            cls._check_contradictory_conditions(nested, issues)
