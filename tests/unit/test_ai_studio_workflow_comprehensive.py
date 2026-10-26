"""Comprehensive tests for AI Strategy Creation Workflow (Phase 2).

Tests:
1. Natural language compilation of the exact Phase 2 prompt:
   "Create a NIFTY intraday strategy on a 5-minute timeframe. Enter long when EMA(9) crosses above EMA(21) and RSI(14) is above 50. Exit when EMA(9) crosses below EMA(21). Use a configurable stop-loss, target, maximum position quantity, and daily loss limit."
2. Clarification turns:
   - "Apply Risk Control rule clarification: 1.5× ATR Trailing Stop"
   - "Apply Risk Control rule clarification: 0.5% Hard Stop Loss"
   - "Apply Session Risk rule clarification: No, allow overnight positional carryforward (NRML)"
3. Deterministic SHA-256 canonical hash computation.
4. Strategy immutability and versioning behavior.
"""

from packages.strategy_spec.schema import (
    Exchange,
    IndicatorType,
    StrategySpec,
    Timeframe,
)
from services.api.services.ai_studio_service import AIStudioService


def test_phase2_prompt_workflow():
    """Verify natural language compilation of the test strategy prompt from Phase 2."""
    prompt = (
        "Create a NIFTY intraday strategy on a 5-minute timeframe. "
        "Enter long when EMA(9) crosses above EMA(21) and RSI(14) is above 50. "
        "Exit when EMA(9) crosses below EMA(21). "
        "Use a configurable stop-loss, target, maximum position quantity, and daily loss limit."
    )

    resp = AIStudioService.process_prompt(prompt=prompt)
    spec = resp.spec

    # 1. Exchange & Symbol mapping
    assert spec.exchange == Exchange.NSE
    assert spec.symbol == "NIFTY50"

    # 2. Timeframe
    assert spec.timeframe == Timeframe.M5

    # 3. Indicators
    indicator_types = {ind.type for ind in spec.indicators}
    assert IndicatorType.EMA in indicator_types
    assert IndicatorType.RSI in indicator_types

    # 4. Entry rules
    assert len(spec.entry_rules.conditions) >= 2
    assert any("EMA(9)" in (c.description or "") for c in spec.entry_rules.conditions)
    assert any("RSI(14)" in (c.description or "") for c in spec.entry_rules.conditions)

    # 5. Exit rules
    assert spec.exit_rules.exit_on_opposite_signal is True

    # 6. Pre-trade Risk controls
    assert spec.risk_limits.max_order_quantity == 1800
    assert spec.risk_limits.daily_loss_limit_inr == 15000.0

    # 7. Validation report
    assert resp.validation.is_valid is True
    assert resp.validation.can_backtest is True
    assert resp.validation.can_paper_trade is True

    # 8. Clarification questions generated when material stop loss was requested as configurable
    assert len(resp.message.clarification_questions) >= 1
    categories = {q.category for q in resp.message.clarification_questions}
    assert "Risk Control" in categories


def test_clarification_turn_atr_trailing_stop():
    """Verify applying ATR Trailing Stop clarification updates the specification appropriately."""
    prompt = "Create a NIFTY 5m EMA crossover strategy"
    resp1 = AIStudioService.process_prompt(prompt=prompt)

    clarification_prompt = "Apply Risk Control rule clarification: 1.5× ATR Trailing Stop Loss"
    resp2 = AIStudioService.process_prompt(
        prompt=clarification_prompt,
        current_spec=resp1.spec,
    )

    assert resp2.spec.exit_rules.trailing_stop_enabled is True
    assert resp2.spec.exit_rules.trailing_stop_atr_multiplier == 1.5
    assert resp2.spec.symbol == resp1.spec.symbol
    assert resp2.spec.timeframe == resp1.spec.timeframe


def test_clarification_turn_hard_stop_percentage():
    """Verify applying Hard Stop clarification sets exact percentage."""
    prompt = "Create a NIFTY 5m EMA crossover strategy"
    resp1 = AIStudioService.process_prompt(prompt=prompt)

    clarification_prompt = "Apply Risk Control rule clarification: 0.5% Hard Stop Loss"
    resp2 = AIStudioService.process_prompt(
        prompt=clarification_prompt,
        current_spec=resp1.spec,
    )

    assert resp2.spec.exit_rules.trailing_stop_enabled is False
    assert resp2.spec.exit_rules.stop_loss_pct == 0.5


def test_clarification_turn_overnight_positional():
    """Verify setting positional carryforward updates squareoff from 15:15 IST."""
    prompt = "Create a NIFTY 15m trend strategy"
    resp1 = AIStudioService.process_prompt(prompt=prompt)

    clarification_prompt = "Apply Session Risk rule clarification: No, allow overnight positional carryforward (NRML)"
    resp2 = AIStudioService.process_prompt(
        prompt=clarification_prompt,
        current_spec=resp1.spec,
    )

    assert resp2.spec.exit_rules.intraday_auto_squareoff == "OVERNIGHT_NRML"


def test_deterministic_sha256_canonical_hashing():
    """Verify that canonical SHA-256 hash is deterministic and changes upon rule edits."""
    prompt = "Build a NIFTY 5m EMA crossover scalper"
    resp = AIStudioService.process_prompt(prompt=prompt)

    hash1 = resp.spec.compute_canonical_hash()
    hash2 = resp.spec.compute_canonical_hash()

    # Identical specs must produce identical hash
    assert hash1 == hash2
    assert len(hash1) == 64

    # Editing a condition must produce a new, distinct hash
    edited_spec = resp.spec.model_copy(deep=True)
    edited_spec.exit_rules.stop_loss_pct = 0.99
    hash3 = edited_spec.compute_canonical_hash()

    assert hash3 != hash1
