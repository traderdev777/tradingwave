"""Automated test suite for Dynamic AI Strategy Builder (ORB, BTST, TSL, Independent Timeframes).

Tests:
1. Intent recognition for "I want to build an ORB strategy for NIFTY"
2. ORB configuration defaults (09:15-09:30 window, 5m entry timeframe, 1m exit timeframe)
3. BTST intent detection and overnight parameter validation
4. TSL engine configuration and incremental conversational refinement
5. Deterministic validation for ORB timing sequence and BTST gap risk
"""

from packages.strategy_spec.schema import (
    BreakoutConfirmationMethod,
    Exchange,
    ORBSettingsSpec,
    StrategyCategory,
    StrategySpec,
    Timeframe,
    TradingMode,
    TSLActivationType,
    TSLDistanceType,
)
from services.api.services.ai_studio_service import AIStudioService
from services.api.services.validation_engine import StrategyValidationEngine


def test_orb_intent_recognition():
    """Verify that 'I want to build an ORB strategy for NIFTY' dynamically configures ORB settings."""
    prompt = "I want to build an ORB strategy for NIFTY."
    resp = AIStudioService.process_prompt(prompt=prompt)
    spec = resp.spec

    # 1. Intent & Category
    assert spec.category == StrategyCategory.ORB
    assert spec.exchange == Exchange.NSE
    assert spec.symbol == "NIFTY50"
    assert "Opening Range Breakout" in spec.name

    # 2. ORB Module Configuration
    assert spec.orb_settings.enabled is True
    assert spec.orb_settings.range_start_time == "09:15"
    assert spec.orb_settings.range_end_time == "09:30"
    assert spec.orb_settings.entry_start_time == "09:30"
    assert spec.orb_settings.entry_cutoff_time == "14:30"
    assert spec.orb_settings.calculation_timeframe == Timeframe.M15
    assert spec.orb_settings.confirmation_method == BreakoutConfirmationMethod.CANDLE_CLOSE

    # 3. Independent Entry and Exit Timeframes
    assert spec.entry_timeframe == Timeframe.M5
    assert spec.exit_timeframe == Timeframe.M1

    # 4. Entry rules contain ORB High / Low references (in nested groups or root)
    all_conds = list(spec.entry_rules.conditions)
    for grp in spec.entry_rules.nested_groups:
        all_conds.extend(grp.conditions)
    assert len(all_conds) >= 2
    sources = {c.right.price_field for c in all_conds}
    assert "orb_high" in sources
    assert "orb_low" in sources
    assert spec.call_entry_rules is not None
    assert len(spec.call_entry_rules.nested_groups) == 2

    # 5. Clarification questions tailored to ORB
    categories = {q.category for q in resp.message.clarification_questions}
    assert "Opening Range Window" in categories
    assert "Breakout Confirmation" in categories

    # 6. Validation passes
    assert resp.validation.can_backtest is True


def test_btst_intent_recognition():
    """Verify that 'Build a BTST strategy on RELIANCE' enables BTST overnight mode."""
    prompt = "Build a BTST strategy on RELIANCE"
    resp = AIStudioService.process_prompt(prompt=prompt)
    spec = resp.spec

    assert spec.trading_mode == TradingMode.BTST
    assert spec.btst_settings.enabled is True
    assert spec.btst_settings.entry_window_start == "15:00"
    assert spec.btst_settings.entry_window_end == "15:25"
    assert spec.btst_settings.next_session_exit_start == "09:15"
    assert spec.btst_settings.next_session_exit_cutoff == "09:30"
    assert spec.exit_rules.intraday_auto_squareoff == "OVERNIGHT_BTST"
    assert resp.validation.can_backtest is True


def test_conversational_incremental_editing():
    """Verify that subsequent conversational prompts update specific fields without wiping existing rules."""
    # Turn 1: Build ORB
    resp1 = AIStudioService.process_prompt(prompt="I want to build an ORB strategy for NIFTY.")
    assert resp1.spec.category == StrategyCategory.ORB
    assert resp1.spec.orb_settings.enabled is True

    # Turn 2: "Make the exit timeframe 1 minute and activate TSL after 20 points profit"
    prompt2 = "Make the exit timeframe 1 minute and activate TSL after 20 points profit, trail 10 points"
    resp2 = AIStudioService.process_prompt(prompt=prompt2, current_spec=resp1.spec)
    spec2 = resp2.spec

    # Verified: Exit timeframe and TSL updated
    assert spec2.exit_timeframe == Timeframe.M1
    assert spec2.tsl_settings.enabled is True
    assert spec2.tsl_settings.activation_value == 20.0
    assert spec2.tsl_settings.activation_type == TSLActivationType.POINTS
    assert spec2.tsl_settings.distance_value == 10.0
    assert spec2.tsl_settings.distance_type == TSLDistanceType.POINTS

    # Verified: Existing ORB settings preserved without deletion
    assert spec2.category == StrategyCategory.ORB
    assert spec2.orb_settings.enabled is True
    assert spec2.orb_settings.range_start_time == "09:15"
    assert spec2.orb_settings.range_end_time == "09:30"
    all_conds2 = list(spec2.entry_rules.conditions)
    for grp in spec2.entry_rules.nested_groups:
        all_conds2.extend(grp.conditions)
    assert len(all_conds2) >= 2


def test_orb_timing_validation_errors():
    """Verify that invalid ORB windows (start >= end, entry before range completion) are blocked."""
    # 1. Start >= End
    spec = StrategySpec(name="Invalid ORB", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.orb_settings = ORBSettingsSpec(
        enabled=True,
        range_start_time="09:30",
        range_end_time="09:15",  # Invalid
        entry_start_time="09:30",
        entry_cutoff_time="14:30",
    )
    rep1 = StrategyValidationEngine.validate(spec)
    assert rep1.can_backtest is False
    assert any(i.code == "INVALID_ORB_RANGE_WINDOW" for i in rep1.issues)

    # 2. Entry start before range end
    spec.orb_settings.range_start_time = "09:15"
    spec.orb_settings.range_end_time = "09:45"
    spec.orb_settings.entry_start_time = "09:30"  # Before 09:45 range completion
    rep2 = StrategyValidationEngine.validate(spec)
    assert rep2.can_backtest is False
    assert any(i.code == "ORB_ENTRY_BEFORE_RANGE_COMPLETION" for i in rep2.issues)


def test_btst_validation_gap_risk_and_squareoff():
    """Verify that BTST mode blocks intraday 15:15 square-off conflict and unacknowledged gap risk."""
    spec = StrategySpec(name="BTST Check", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.trading_mode = TradingMode.BTST
    spec.btst_settings.enabled = True
    spec.btst_settings.gap_risk_acknowledged = False
    spec.exit_rules.intraday_auto_squareoff = "15:15 IST"  # Conflicts with BTST

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    codes = {i.code for i in report.issues}
    assert "BTST_INTRADAY_SQUAREOFF_CONFLICT" in codes
    assert "BTST_GAP_RISK_NOT_ACKNOWLEDGED" in codes


def test_tsl_parameter_validation():
    """Verify that non-positive TSL values and future evaluation offsets are rejected."""
    spec = StrategySpec(name="TSL Check", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.tsl_settings.enabled = True
    spec.tsl_settings.activation_value = -5.0  # Invalid
    spec.tsl_settings.distance_value = 0.0  # Invalid
    spec.tsl_settings.evaluation_candle_offset = 1  # Lookahead bias

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    codes = {i.code for i in report.issues}
    assert "INVALID_TSL_ACTIVATION" in codes
    assert "INVALID_TSL_DISTANCE" in codes
    assert "TSL_LOOKAHEAD_BIAS" in codes


def test_multi_target_excess_allocation():
    """Verify that multi-target leg allocations exceeding 100% are blocked."""
    from packages.strategy_spec.schema import ProfitTargetLeg

    spec = StrategySpec(name="Target Allocation Check", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.exit_rules.profit_target_legs = [
        ProfitTargetLeg(target_number=1, target_pct=1.0, quantity_allocation_pct=60.0),
        ProfitTargetLeg(target_number=2, target_pct=2.0, quantity_allocation_pct=50.0),  # Sum = 110% > 100%
    ]

    report = StrategyValidationEngine.validate(spec)
    assert report.can_backtest is False
    assert any(i.code == "EXCESS_TARGET_ALLOCATION" for i in report.issues)


def test_lookahead_offset_rejection():
    """Verify that positive historical offsets (future data) are rejected at schema level."""
    import pytest
    from pydantic import ValidationError
    from packages.strategy_spec.schema import ConditionOperand

    with pytest.raises(ValidationError) as exc_info:
        ConditionOperand(type="price_field", price_field="close", offset=1)  # Future offset > 0

    assert "Input should be less than or equal to 0" in str(exc_info.value)


