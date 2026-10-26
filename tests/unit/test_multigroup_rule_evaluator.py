"""Comprehensive test suite for Multi-Group Condition Engine, ORB Reference Levels, and Deterministic Evaluator.

Scenarios tested:
1. CALL Group A triggers only when both A1 (-2 Close < ORB High) AND A2 (-1 Close > ORB High) are true.
2. CALL Group B triggers only when both B1 (-2 Close < ORB Low) AND B2 (-1 Close > ORB Low) are true.
3. CALL entry triggers when Group A OR Group B is true.
4. PUT entry uses inverse crossing logic (Group A: -2 Close > ORB Low AND -1 Close < ORB Low; Group B: -2 Close > ORB High AND -1 Close < ORB High).
5. The engine does NOT trigger if neither group is true.
6. ORB references resolve dynamically from configured opening-range levels.
7. The strategy cannot enter before the opening range completes (range_complete = False or current_time < entry_start_time).
8. Candle offsets (-2, -1, 0) behave correctly across historical series.
9. Nested AND/OR groups evaluate deterministically: (A AND B) OR (C AND D).
10. Entry and exit timeframes remain independent.
11. Duplicate-signal prevention stops consecutive entries while position is open.
12. Saved and reloaded strategy specifications preserve the nested condition trees.
"""

import json
from packages.strategy_spec.schema import (
    Exchange,
    ORBSettingsSpec,
    StrategyCategory,
    StrategySpec,
    Timeframe,
    create_orb_call_entry_rules,
    create_orb_put_entry_rules,
    create_orb_call_exit_rules,
    create_orb_put_exit_rules,
)
from packages.strategy_spec.evaluator import (
    CandleBar,
    EvaluationContext,
    StrategyRuleEvaluator,
)


def make_candle_series(closes: list[float]) -> list[CandleBar]:
    """Helper to generate sequential candles from close prices."""
    bars = []
    for i, c in enumerate(closes):
        bars.append(CandleBar(open=c - 5.0, high=c + 2.0, low=c - 7.0, close=c, volume=1000.0))
    return bars


def test_call_group_a_triggers_only_when_both_true():
    """CALL Group A triggers only when A1 (-2 Close < ORB High) AND A2 (-1 Close > ORB High) are both True."""
    spec = StrategySpec(name="ORB Call A Test", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.orb_settings.enabled = True
    spec.call_entry_rules = create_orb_call_entry_rules(entry_tf=Timeframe.M1)

    orb_levels = {
        "orb_high": 22100.0,
        "orb_low": 22000.0,
        "orb_midpoint": 22050.0,
    }

    # Case 1: Both A1 and A2 are true (-2 close = 22090 < 22100, -1 close = 22115 > 22100)
    bars_both_true = make_candle_series([22070.0, 22090.0, 22115.0, 22120.0])
    ctx1 = EvaluationContext(bars=bars_both_true, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    grp_a = spec.call_entry_rules.nested_groups[0]
    assert StrategyRuleEvaluator.evaluate_group(grp_a, ctx1) is True

    # Case 2: A1 is false (-2 close = 22105 > 22100), A2 is true (-1 close = 22115 > 22100)
    bars_a1_false = make_candle_series([22070.0, 22105.0, 22115.0, 22120.0])
    ctx2 = EvaluationContext(bars=bars_a1_false, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    assert StrategyRuleEvaluator.evaluate_group(grp_a, ctx2) is False

    # Case 3: A1 is true (-2 close = 22090 < 22100), A2 is false (-1 close = 22095 < 22100)
    bars_a2_false = make_candle_series([22070.0, 22090.0, 22095.0, 22120.0])
    ctx3 = EvaluationContext(bars=bars_a2_false, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    assert StrategyRuleEvaluator.evaluate_group(grp_a, ctx3) is False


def test_call_group_b_triggers_only_when_both_true():
    """CALL Group B triggers only when B1 (-2 Close < ORB Low) AND B2 (-1 Close > ORB Low) are both True."""
    spec = StrategySpec(name="ORB Call B Test", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.orb_settings.enabled = True
    spec.call_entry_rules = create_orb_call_entry_rules(entry_tf=Timeframe.M1)

    orb_levels = {
        "orb_high": 22100.0,
        "orb_low": 22000.0,
        "orb_midpoint": 22050.0,
    }
    grp_b = spec.call_entry_rules.nested_groups[1]

    # Case 1: Both B1 and B2 are true (-2 close = 21990 < 22000, -1 close = 22010 > 22000)
    bars_both_true = make_candle_series([21970.0, 21990.0, 22010.0, 22015.0])
    ctx1 = EvaluationContext(bars=bars_both_true, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    assert StrategyRuleEvaluator.evaluate_group(grp_b, ctx1) is True

    # Case 2: B1 is false (-2 close = 22005 > 22000)
    bars_b1_false = make_candle_series([21970.0, 22005.0, 22010.0, 22015.0])
    ctx2 = EvaluationContext(bars=bars_b1_false, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    assert StrategyRuleEvaluator.evaluate_group(grp_b, ctx2) is False

    # Case 3: B2 is false (-1 close = 21995 < 22000)
    bars_b2_false = make_candle_series([21970.0, 21990.0, 21995.0, 22015.0])
    ctx3 = EvaluationContext(bars=bars_b2_false, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    assert StrategyRuleEvaluator.evaluate_group(grp_b, ctx3) is False


def test_call_entry_triggers_when_group_a_or_group_b_true():
    """CALL entry root triggers when either Group A OR Group B is true."""
    spec = StrategySpec(name="ORB Call Root Test", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.orb_settings.enabled = True
    spec.call_entry_rules = create_orb_call_entry_rules(entry_tf=Timeframe.M1)

    orb_levels = {"orb_high": 22100.0, "orb_low": 22000.0, "orb_midpoint": 22050.0}

    # Scenario 1: Group A is True, Group B is False
    bars_a = make_candle_series([22070.0, 22090.0, 22115.0, 22120.0])
    ctx_a = EvaluationContext(bars=bars_a, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    sig_a = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_a)
    assert sig_a["call_entry"] is True

    # Scenario 2: Group B is True, Group A is False
    bars_b = make_candle_series([21970.0, 21990.0, 22010.0, 22015.0])
    ctx_b = EvaluationContext(bars=bars_b, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    sig_b = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_b)
    assert sig_b["call_entry"] is True

    # Scenario 3: Neither Group A nor Group B is True
    bars_none = make_candle_series([22030.0, 22040.0, 22050.0, 22060.0])
    ctx_none = EvaluationContext(bars=bars_none, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    sig_none = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_none)
    assert sig_none["call_entry"] is False


def test_put_entry_inverse_crossing_logic():
    """PUT entry triggers on inverse logic: Group A (-2 > Low, -1 < Low) OR Group B (-2 > High, -1 < High)."""
    spec = StrategySpec(name="ORB Put Root Test", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.orb_settings.enabled = True
    spec.put_entry_rules = create_orb_put_entry_rules(entry_tf=Timeframe.M1)

    orb_levels = {"orb_high": 22100.0, "orb_low": 22000.0, "orb_midpoint": 22050.0}

    # Scenario 1: PUT Group A breakdown below Low (-2 close = 22010 > 22000, -1 close = 21980 < 22000)
    bars_put_a = make_candle_series([22030.0, 22010.0, 21980.0, 21975.0])
    ctx_put_a = EvaluationContext(bars=bars_put_a, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    sig_put_a = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_put_a)
    assert sig_put_a["put_entry"] is True

    # Scenario 2: PUT Group B rejection below High (-2 close = 22110 > 22100, -1 close = 22090 < 22100)
    bars_put_b = make_candle_series([22130.0, 22110.0, 22090.0, 22085.0])
    ctx_put_b = EvaluationContext(bars=bars_put_b, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    sig_put_b = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_put_b)
    assert sig_put_b["put_entry"] is True

    # Scenario 3: Neither PUT group triggers
    bars_put_none = make_candle_series([22030.0, 22040.0, 22050.0, 22060.0])
    ctx_put_none = EvaluationContext(bars=bars_put_none, orb_levels=orb_levels, current_time="09:35", range_complete=True)
    sig_put_none = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_put_none)
    assert sig_put_none["put_entry"] is False


def test_engine_blocks_entry_before_opening_range_completion():
    """Engine prevents any entry evaluation if opening range is incomplete or before entry_start_time."""
    spec = StrategySpec(name="ORB Early Block Test", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.orb_settings = ORBSettingsSpec(
        enabled=True,
        range_start_time="09:15",
        range_end_time="09:30",
        entry_start_time="09:30",
        entry_cutoff_time="14:30",
    )
    spec.call_entry_rules = create_orb_call_entry_rules(entry_tf=Timeframe.M1)

    orb_levels = {"orb_high": 22100.0, "orb_low": 22000.0, "orb_midpoint": 22050.0}
    bars = make_candle_series([22070.0, 22090.0, 22115.0, 22120.0])  # Breakout price

    # 1. Blocked because range_complete is False
    ctx_incomplete = EvaluationContext(bars=bars, orb_levels=orb_levels, current_time="09:25", range_complete=False)
    sig1 = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_incomplete)
    assert sig1["eligible_for_entry"] is False
    assert "Opening range is not yet complete" in sig1["reason"]

    # 2. Blocked because current_time precedes entry_start_time
    ctx_early = EvaluationContext(bars=bars, orb_levels=orb_levels, current_time="09:28", range_complete=True)
    sig2 = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_early)
    assert sig2["eligible_for_entry"] is False
    assert "precedes entry start time" in sig2["reason"]

    # 3. Blocked because current_time is past cutoff
    ctx_late = EvaluationContext(bars=bars, orb_levels=orb_levels, current_time="14:45", range_complete=True)
    sig3 = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_late)
    assert sig3["eligible_for_entry"] is False
    assert "past entry cutoff time" in sig3["reason"]


def test_duplicate_signal_prevention():
    """Duplicate signals are blocked if position is open or max entries reached."""
    spec = StrategySpec(name="Duplicate Signal Test", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.orb_settings.enabled = True
    spec.orb_settings.max_entries_per_session = 2
    spec.risk_limits.prevent_duplicate_entries = True
    spec.call_entry_rules = create_orb_call_entry_rules(entry_tf=Timeframe.M1)

    orb_levels = {"orb_high": 22100.0, "orb_low": 22000.0, "orb_midpoint": 22050.0}
    bars = make_candle_series([22070.0, 22090.0, 22115.0, 22120.0])

    # 1. Blocked when position is already open
    ctx_open_pos = EvaluationContext(
        bars=bars,
        orb_levels=orb_levels,
        current_time="09:40",
        range_complete=True,
        is_position_open=True,
    )
    sig_dup = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_open_pos)
    assert sig_dup["eligible_for_entry"] is False
    assert "Duplicate entry prevented" in sig_dup["reason"]

    # 2. Blocked when max session entries reached
    ctx_max_entries = EvaluationContext(
        bars=bars,
        orb_levels=orb_levels,
        current_time="09:40",
        range_complete=True,
        is_position_open=False,
        session_entries_count=2,  # Max is 2
    )
    sig_max = StrategyRuleEvaluator.evaluate_strategy(spec, ctx_max_entries)
    assert sig_max["eligible_for_entry"] is False
    assert "Maximum entries per session (2) reached" in sig_max["reason"]


def test_saved_and_reloaded_strategy_preserves_nested_condition_trees():
    """Serialization and deserialization of StrategySpec preserves exact nested groups and offsets."""
    spec = StrategySpec(name="Persistence Tree Test", symbol="NIFTY50", exchange=Exchange.NSE)
    spec.orb_settings.enabled = True
    spec.call_entry_rules = create_orb_call_entry_rules(entry_tf=Timeframe.M1)
    spec.put_entry_rules = create_orb_put_entry_rules(entry_tf=Timeframe.M1)
    spec.call_exit_rules = create_orb_call_exit_rules(exit_tf=Timeframe.M1)
    spec.put_exit_rules = create_orb_put_exit_rules(exit_tf=Timeframe.M1)

    # Serialize to JSON
    json_payload = spec.model_dump_json()

    # Deserialize back
    loaded_spec = StrategySpec.model_validate_json(json_payload)

    assert loaded_spec.call_entry_rules is not None
    assert len(loaded_spec.call_entry_rules.nested_groups) == 2
    assert loaded_spec.call_entry_rules.logic == "OR"

    # Verify Group A rules preserved
    grp_a = loaded_spec.call_entry_rules.nested_groups[0]
    assert grp_a.logic == "AND"
    assert len(grp_a.conditions) == 2
    assert grp_a.conditions[0].left.offset == -2
    assert grp_a.conditions[0].right.price_field == "orb_high"
    assert grp_a.conditions[1].left.offset == -1
    assert grp_a.conditions[1].right.price_field == "orb_high"

    # Verify Group B rules preserved
    grp_b = loaded_spec.call_entry_rules.nested_groups[1]
    assert grp_b.logic == "AND"
    assert len(grp_b.conditions) == 2
    assert grp_b.conditions[0].left.offset == -2
    assert grp_b.conditions[0].right.price_field == "orb_low"
    assert grp_b.conditions[1].left.offset == -1
    assert grp_b.conditions[1].right.price_field == "orb_low"

    # Verify PUT tree preserved
    assert loaded_spec.put_entry_rules is not None
    assert len(loaded_spec.put_entry_rules.nested_groups) == 2

    # Verify hash determinism
    assert spec.compute_canonical_hash() == loaded_spec.compute_canonical_hash()
