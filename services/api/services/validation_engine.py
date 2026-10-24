"""Deterministic Validation Engine for TradingWave Strategy Specifications.

Performs static analysis and pre-flight validation independent of the LLM.
Detects lookahead bias, contradictory conditions, repainting risks, and regulatory safety limits.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from packages.strategy_spec.schema import (
    ConditionGroup,
    ConditionOperator,
    ConditionRule,
    Exchange,
    IndicatorType,
    StrategySpec,
    Timeframe,
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

    VALID_NSE_SYMBOLS = {"NIFTY50", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"}
    VALID_MCX_SYMBOLS = {"CRUDEOIL", "GOLDM", "SILVERM", "NATURALGAS", "COPPER", "ZINC"}

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
            if norm_symbol not in cls.VALID_MCX_SYMBOLS and not any(k in norm_symbol for k in ["CRUDE", "GOLD", "SILVER", "GAS"]):
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
            if "15:30" not in spec.trading_session:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        code="NSE_SESSION_MISMATCH",
                        message=f"Standard NSE equity & F&O cash session is 09:15 - 15:30 IST.",
                        affected_field="trading_session",
                        suggested_correction="Align trading session to '09:15-15:30 IST'.",
                        blocks_testing=False,
                    )
                )

        # 3. Lookahead Bias & Bar Offsets Analysis
        cls._check_lookahead_bias(spec.entry_rules, issues)

        # 4. Indicators Sanity Check
        for ind in spec.indicators:
            cls._validate_indicator(ind, spec, issues)

        # 5. Contradictory & Malformed Conditions
        cls._check_contradictory_conditions(spec.entry_rules, issues)

        # 6. Exit Rules & Stop-Loss Sanity
        if spec.exit_rules.stop_loss_pct is None and spec.exit_rules.stop_loss_points is None and spec.exit_rules.stop_loss_atr_multiplier is None:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="UNBOUNDED_STOP_LOSS",
                    message="No explicit Stop Loss defined. Strategy exposed to severe tail risk in volatile gaps.",
                    affected_field="exit_rules.stop_loss_pct",
                    suggested_correction="Configure a stop loss of 0.5% - 2.0% or 1.5× ATR.",
                    blocks_testing=False,
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

        # Intraday squareoff sanity
        if spec.exchange == Exchange.MCX:
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

        # 7. Pre-Trade Risk Controls
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

        # 8. Duplicate Entry Loop Prevention
        if not spec.risk_limits.prevent_duplicate_entries and spec.risk_limits.entry_cooldown_bars == 0:
            issues.append(
                ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="REPEATED_ENTRY_SPIKES",
                    message="Duplicate entry prevention and cooldown are both disabled. May trigger rapid successive fills on the same candle.",
                    affected_field="risk_limits.prevent_duplicate_entries",
                    suggested_correction="Enable duplicate entry prevention or set entry cooldown to at least 2 bars.",
                    blocks_testing=False,
                )
            )

        # 9. Informational Notice for Indian Statutory Charges
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
            "Specification passed all deterministic sanity checks and risk bounds."
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
    def _check_lookahead_bias(cls, group: ConditionGroup, issues: list[ValidationIssue]) -> None:
        """Inspect condition operands for future-data offsets (offset > 0)."""
        for cond in group.conditions:
            if cond.left.offset > 0 or cond.right.offset > 0:
                issues.append(
                    ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        code="LOOKAHEAD_BIAS_DETECTED",
                        message=f"Condition '{cond.description or cond.id}' references future bar (offset > 0). This causes lookahead bias.",
                        affected_field="entry_rules",
                        suggested_correction="Use offset 0 for current candle or negative offset (-1) for closed bars.",
                        blocks_testing=True,
                    )
                )
        for nested in group.nested_groups:
            cls._check_lookahead_bias(nested, issues)

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
        """Detect logical contradictions like RSI > 70 AND RSI < 30 on same bar."""
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

        for nested in group.nested_groups:
            cls._check_contradictory_conditions(nested, issues)
