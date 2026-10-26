"""Comprehensive static validation tests for TradingWave Strategy Validation Engine.

Tests all 20 Phase 3 deterministic validation criteria:
- Lookahead bias & positive offsets
- Multi-timeframe data alignment & intrabar repainting risks
- Contradictory condition detection (RSI bounds & opposing crosses)
- Instrument & exchange alignment (MCX vs NSE/BSE)
- Session boundaries & end-of-session square-off
- Pre-trade risk limits & position sizing bounds
- Empty entry rules
- Standard indicator parameter bounds
"""

import pytest

from packages.strategy_spec.schema import (
    ConditionGroup,
    ConditionOperand,
    ConditionOperator,
    ConditionRule,
    Exchange,
    ExitRulesSpec,
    IndicatorSpec,
    IndicatorType,
    PositionSizingMethod,
    PositionSizingSpec,
    RiskLimitsSpec,
    StrategySpec,
    Timeframe,
)
from services.api.services.validation_engine import (
    StrategyValidationEngine,
    ValidationSeverity,
)


def _build_valid_strategy_spec() -> StrategySpec:
    """Helper to build a pristine, fully validated NIFTY intraday momentum spec."""
    fast_ema = IndicatorSpec(id="ind_ema9", type=IndicatorType.EMA, period=9)
    slow_ema = IndicatorSpec(id="ind_ema21", type=IndicatorType.EMA, period=21)
    rsi = IndicatorSpec(id="ind_rsi14", type=IndicatorType.RSI, period=14)

    conditions = [
        ConditionRule(
            left=ConditionOperand(type="indicator", indicator_id=fast_ema.id, indicator_type=IndicatorType.EMA, offset=0),
            operator=ConditionOperator.CROSSES_ABOVE,
            right=ConditionOperand(type="indicator", indicator_id=slow_ema.id, indicator_type=IndicatorType.EMA, offset=0),
            description="EMA(9) crosses above EMA(21)",
        ),
        ConditionRule(
            left=ConditionOperand(type="indicator", indicator_id=rsi.id, indicator_type=IndicatorType.RSI, offset=0),
            operator=ConditionOperator.GREATER_THAN,
            right=ConditionOperand(type="constant", constant_value=50.0, offset=0),
            description="RSI(14) > 50",
        ),
    ]

    return StrategySpec(
        name="NSE NIFTY50 Intraday Alpha",
        symbol="NIFTY50",
        exchange=Exchange.NSE,
        timeframe=Timeframe.M5,
        trading_session="09:15-15:30 IST",
        indicators=[fast_ema, slow_ema, rsi],
        entry_rules=ConditionGroup(logic="AND", conditions=conditions),
        exit_rules=ExitRulesSpec(
            stop_loss_pct=0.75,
            target_profit_pct=1.75,
            trailing_stop_enabled=False,
            intraday_auto_squareoff="15:15 IST",
            exit_on_opposite_signal=True,
        ),
        position_sizing=PositionSizingSpec(
            method=PositionSizingMethod.FIXED_CAPITAL,
            value=100000.0,
            max_risk_per_trade_pct=1.0,
            allocation_capital_inr=500000.0,
        ),
        risk_limits=RiskLimitsSpec(
            max_capital_allocation_inr=500000.0,
            max_open_positions=3,
            daily_loss_limit_inr=15000.0,
            max_order_quantity=1800,
            prevent_duplicate_entries=True,
            entry_cooldown_bars=3,
        ),
    )


def test_valid_strategy_passes_all_checks():
    """Verify that a compliant strategy produces zero errors and can backtest."""
    spec = _build_valid_strategy_spec()
    report = StrategyValidationEngine.validate(spec)
    assert report.is_valid is True
    assert report.can_backtest is True
    assert report.can_paper_trade is True
    assert report.error_count == 0


def test_lookahead_bias_detection():
    """Verify that bar offsets > 0 are rejected by the validator to prevent future-data peeking."""
    spec = _build_valid_strategy_spec()
    # Bypass Pydantic field constraint to test engine defense-in-depth
    bad_rule = ConditionRule(
        left=ConditionOperand(type="price_field", price_field="close", offset=0),
        operator=ConditionOperator.GREATER_THAN,
        right=ConditionOperand.model_construct(type="price_field", price_field="close", offset=1),
    )
    spec.entry_rules.conditions.append(bad_rule)

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    assert any(i.code == "LOOKAHEAD_BIAS_DETECTED" for i in report.issues)
    issue = next(i for i in report.issues if i.code == "LOOKAHEAD_BIAS_DETECTED")
    assert issue.severity == ValidationSeverity.ERROR
    assert issue.blocks_testing is True


def test_higher_timeframe_repainting_risk():
    """Verify that referencing forming candles of higher timeframe indicators with offset 0 is blocked."""
    spec = _build_valid_strategy_spec()
    # Strategy is on 5m. Add a 1h EMA indicator
    htf_ema = IndicatorSpec(id="ind_ema_htf", type=IndicatorType.EMA, period=50, timeframe=Timeframe.H1)
    spec.indicators.append(htf_ema)

    # Reference with offset 0 (forming 1h bar -> lookahead/repainting)
    spec.entry_rules.conditions.append(
        ConditionRule(
            left=ConditionOperand(type="price_field", price_field="close", offset=0),
            operator=ConditionOperator.GREATER_THAN,
            right=ConditionOperand(type="indicator", indicator_id=htf_ema.id, indicator_type=IndicatorType.EMA, offset=0),
        )
    )

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    assert any(i.code == "HIGHER_TIMEFRAME_REPAINTING_RISK" for i in report.issues)

    # Now fix to offset -1 (confirmed closed 1h bar) -> should pass
    spec.entry_rules.conditions[-1].right.offset = -1
    report_fixed = StrategyValidationEngine.validate(spec)
    assert not any(i.code == "HIGHER_TIMEFRAME_REPAINTING_RISK" for i in report_fixed.issues)


def test_contradictory_rsi_bounds():
    """Verify that RSI > 70 AND RSI < 30 on same candle is flagged as a logical impossibility."""
    spec = _build_valid_strategy_spec()
    spec.entry_rules.conditions.extend([
        ConditionRule(
            left=ConditionOperand(type="indicator", indicator_type=IndicatorType.RSI),
            operator=ConditionOperator.GREATER_THAN,
            right=ConditionOperand(type="constant", constant_value=70.0),
        ),
        ConditionRule(
            left=ConditionOperand(type="indicator", indicator_type=IndicatorType.RSI),
            operator=ConditionOperator.LESS_THAN,
            right=ConditionOperand(type="constant", constant_value=30.0),
        ),
    ])

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    assert any(i.code == "CONTRADICTORY_RSI_RULES" for i in report.issues)


def test_contradictory_opposing_crosses():
    """Verify that CROSSES_ABOVE and CROSSES_BELOW between identical operands on same bar is blocked."""
    spec = _build_valid_strategy_spec()
    ema9_op = ConditionOperand(type="indicator", indicator_id="ind_ema9", indicator_type=IndicatorType.EMA)
    ema21_op = ConditionOperand(type="indicator", indicator_id="ind_ema21", indicator_type=IndicatorType.EMA)

    spec.entry_rules.conditions = [
        ConditionRule(left=ema9_op, operator=ConditionOperator.CROSSES_ABOVE, right=ema21_op),
        ConditionRule(left=ema9_op, operator=ConditionOperator.CROSSES_BELOW, right=ema21_op),
    ]

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    assert any(i.code == "CONTRADICTORY_SIGNALS" for i in report.issues)


def test_instrument_exchange_mismatch():
    """Verify that commodity symbols on NSE and equity symbols on MCX are blocked."""
    # Commodity on NSE
    spec_nse = _build_valid_strategy_spec()
    spec_nse.symbol = "CRUDEOIL"
    spec_nse.exchange = Exchange.NSE
    report_nse = StrategyValidationEngine.validate(spec_nse)
    assert report_nse.can_backtest is False
    assert any(i.code == "INSTRUMENT_EXCHANGE_MISMATCH" for i in report_nse.issues)

    # Equity index on MCX
    spec_mcx = _build_valid_strategy_spec()
    spec_mcx.symbol = "NIFTY50"
    spec_mcx.exchange = Exchange.MCX
    spec_mcx.trading_session = "09:00-23:30 IST"
    report_mcx = StrategyValidationEngine.validate(spec_mcx)
    assert report_mcx.can_backtest is False
    assert any(i.code == "INSTRUMENT_EXCHANGE_MISMATCH" for i in report_mcx.issues)


def test_intraday_squareoff_past_cash_close():
    """Verify that scheduling NSE square-off after cash market close (15:30 IST) is blocked."""
    spec = _build_valid_strategy_spec()
    spec.exit_rules.intraday_auto_squareoff = "15:45 IST"

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    assert any(i.code == "INVALID_SQUAREOFF_TIME" for i in report.issues)


def test_empty_entry_rules_rejected():
    """Verify that strategy without entry conditions is blocked from execution."""
    spec = _build_valid_strategy_spec()
    spec.entry_rules.conditions = []
    spec.entry_rules.nested_groups = []

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    assert any(i.code == "EMPTY_ENTRY_RULES" for i in report.issues)


def test_negative_risk_parameters_rejected():
    """Verify that negative stop loss or zero capital allocations are blocked."""
    spec = _build_valid_strategy_spec()
    # Bypass field constraints via model_construct to test engine guards
    spec.exit_rules = ExitRulesSpec.model_construct(stop_loss_pct=-1.0, target_profit_pct=1.5)
    spec.position_sizing = PositionSizingSpec.model_construct(
        method=PositionSizingMethod.FIXED_CAPITAL,
        value=-50000.0,
        max_risk_per_trade_pct=-0.5,
        allocation_capital_inr=0.0,
    )
    spec.risk_limits = RiskLimitsSpec.model_construct(
        daily_loss_limit_inr=-1000.0,
        max_open_positions=0,
        max_order_quantity=0,
    )

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    codes = {i.code for i in report.issues}
    assert "INVALID_STOP_LOSS" in codes
    assert "INVALID_POSITION_SIZING" in codes
    assert "INVALID_ALLOCATION_CAPITAL" in codes
    assert "INVALID_DAILY_LOSS_LIMIT" in codes
    assert "INVALID_MAX_POSITIONS" in codes
    assert "INVALID_MAX_ORDER_QUANTITY" in codes


def test_indicator_bounds_validation():
    """Verify that moving average periods outside standard financial bounds are blocked."""
    spec = _build_valid_strategy_spec()
    spec.indicators[0].period = 0  # Invalid MA period
    spec.indicators[2].period = 101  # Invalid RSI period

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    codes = {i.code for i in report.issues}
    assert "INVALID_MA_PERIOD" in codes
    assert "INVALID_RSI_PERIOD" in codes
