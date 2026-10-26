"""Deterministic rule evaluator for multi-group condition trees, ORB levels, and historical offsets."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from packages.strategy_spec.schema import (
    ConditionGroup,
    ConditionOperand,
    ConditionOperator,
    ConditionRule,
    StrategySpec,
)


@dataclass
class CandleBar:
    """Standard candlestick bar representation."""

    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    timestamp: str | None = None

    @property
    def typical_price(self) -> float:
        return (self.high + self.low + self.close) / 3.0

    @property
    def hl2(self) -> float:
        return (self.high + self.low) / 2.0

    @property
    def hlc3(self) -> float:
        return (self.high + self.low + self.close) / 3.0


@dataclass
class EvaluationContext:
    """Context holding historical candles, ORB reference levels, and session state."""

    bars: list[CandleBar]
    orb_levels: dict[str, float] = field(default_factory=dict)
    current_time: str = "09:35"
    range_complete: bool = True
    is_position_open: bool = False
    session_entries_count: int = 0
    indicator_values: dict[str, list[float]] = field(default_factory=dict)

    def get_bar_at_offset(self, offset: int) -> CandleBar | None:
        """Retrieve candle bar at negative offset (0 is current/forming, -1 is previous closed, -2 is two ago)."""
        if offset > 0:
            raise ValueError(f"Lookahead bias: positive offset {offset} is strictly prohibited.")
        idx = len(self.bars) - 1 + offset
        if 0 <= idx < len(self.bars):
            return self.bars[idx]
        return None

    def get_price_source(self, price_field: str, offset: int) -> float | None:
        """Resolve price field from candle or calculated ORB levels."""
        # 1. ORB reference levels (independent of candle offset unless specified)
        if price_field in self.orb_levels:
            return self.orb_levels[price_field]

        # Aliases for ORB levels
        if price_field == "orb_high" and "orb_high" in self.orb_levels:
            return self.orb_levels["orb_high"]
        if price_field == "orb_low" and "orb_low" in self.orb_levels:
            return self.orb_levels["orb_low"]
        if price_field == "orb_midpoint" and "orb_midpoint" in self.orb_levels:
            return self.orb_levels["orb_midpoint"]
        if price_field in ("first_orb_candle_high", "first_candle_high") and "first_orb_candle_high" in self.orb_levels:
            return self.orb_levels["first_orb_candle_high"]
        if price_field in ("first_orb_candle_low", "first_candle_low") and "first_orb_candle_low" in self.orb_levels:
            return self.orb_levels["first_orb_candle_low"]

        # 2. Historical candle fields
        bar = self.get_bar_at_offset(offset)
        if not bar:
            return None

        if price_field == "close":
            return bar.close
        if price_field == "open":
            return bar.open
        if price_field == "high":
            return bar.high
        if price_field == "low":
            return bar.low
        if price_field == "volume":
            return bar.volume
        if price_field == "typical_price":
            return bar.typical_price
        if price_field == "hl2":
            return bar.hl2
        if price_field == "hlc3":
            return bar.hlc3

        # Previous bar high/low shorthand
        if price_field == "prev_candle_high":
            prev_bar = self.get_bar_at_offset(offset - 1)
            return prev_bar.high if prev_bar else None
        if price_field == "prev_candle_low":
            prev_bar = self.get_bar_at_offset(offset - 1)
            return prev_bar.low if prev_bar else None

        return None


class StrategyRuleEvaluator:
    """Evaluates nested condition groups, ORB breakout conditions, and crossover logic."""

    @classmethod
    def resolve_operand(cls, operand: ConditionOperand, context: EvaluationContext, default_offset: int = 0) -> float | None:
        """Resolve an operand into a numeric value."""
        offset = operand.offset if operand.offset is not None else default_offset
        if operand.type == "constant":
            return operand.constant_value

        if operand.type == "price_field" and operand.price_field:
            return context.get_price_source(operand.price_field, offset)

        if operand.type == "indicator":
            ind_key = operand.indicator_id or (operand.indicator_type.value if operand.indicator_type else None)
            if ind_key and ind_key in context.indicator_values:
                series = context.indicator_values[ind_key]
                idx = len(series) - 1 + offset
                if 0 <= idx < len(series):
                    return series[idx]

        return None

    @classmethod
    def evaluate_rule(cls, rule: ConditionRule, context: EvaluationContext) -> bool:
        """Evaluate an atomic ConditionRule comparing left and right operands."""
        left_val = cls.resolve_operand(rule.left, context)
        right_val = cls.resolve_operand(rule.right, context)

        if left_val is None or right_val is None:
            return False

        op = rule.operator

        if op == ConditionOperator.GREATER_THAN:
            return left_val > right_val
        if op == ConditionOperator.LESS_THAN:
            return left_val < right_val
        if op == ConditionOperator.GREATER_THAN_OR_EQUAL:
            return left_val >= right_val
        if op == ConditionOperator.LESS_THAN_OR_EQUAL:
            return left_val <= right_val
        if op == ConditionOperator.EQUALS:
            return abs(left_val - right_val) < 1e-6

        # Crossover logic: compares previous bar with current bar
        if op in (ConditionOperator.CROSSES_ABOVE, ConditionOperator.CROSSES_ABOVE_LEVEL):
            prev_left = cls.resolve_operand(rule.left, context, default_offset=-1)
            prev_right = cls.resolve_operand(rule.right, context, default_offset=-1)
            if prev_left is None or prev_right is None:
                return False
            return prev_left <= prev_right and left_val > right_val

        if op in (ConditionOperator.CROSSES_BELOW, ConditionOperator.CROSSES_BELOW_LEVEL):
            prev_left = cls.resolve_operand(rule.left, context, default_offset=-1)
            prev_right = cls.resolve_operand(rule.right, context, default_offset=-1)
            if prev_left is None or prev_right is None:
                return False
            return prev_left >= prev_right and left_val < right_val

        return False

    @classmethod
    def evaluate_group(cls, group: ConditionGroup | None, context: EvaluationContext) -> bool:
        """Recursively evaluate a ConditionGroup containing conditions and nested groups."""
        if group is None:
            return False

        has_conditions = len(group.conditions) > 0
        has_nested = len(group.nested_groups) > 0

        if not has_conditions and not has_nested:
            return False

        if group.logic == "AND":
            # All conditions must be True
            for cond in group.conditions:
                if not cls.evaluate_rule(cond, context):
                    return False
            # All nested groups must be True
            for nested in group.nested_groups:
                if not cls.evaluate_group(nested, context):
                    return False
            return True

        if group.logic == "OR":
            # Any condition True or any nested group True
            for cond in group.conditions:
                if cls.evaluate_rule(cond, context):
                    return True
            for nested in group.nested_groups:
                if cls.evaluate_group(nested, context):
                    return True
            return False

        return False

    @classmethod
    def evaluate_strategy(cls, spec: StrategySpec, context: EvaluationContext) -> dict[str, Any]:
        """Comprehensive strategy signal evaluation for CALL, PUT, entries, and exits."""
        result = {
            "eligible_for_entry": True,
            "reason": "OK",
            "call_entry": False,
            "put_entry": False,
            "call_exit": False,
            "put_exit": False,
        }

        # 1. Opening range completion and time window checks
        if spec.orb_settings and spec.orb_settings.enabled:
            if not context.range_complete:
                result["eligible_for_entry"] = False
                result["reason"] = "Opening range is not yet complete."
                return result

            if context.current_time < spec.orb_settings.entry_start_time:
                result["eligible_for_entry"] = False
                result["reason"] = f"Current time ({context.current_time}) precedes entry start time ({spec.orb_settings.entry_start_time})."
                return result

            if context.current_time > spec.orb_settings.entry_cutoff_time:
                result["eligible_for_entry"] = False
                result["reason"] = f"Current time ({context.current_time}) is past entry cutoff time ({spec.orb_settings.entry_cutoff_time})."
                return result

        # 2. Risk & Session constraints
        max_entries = spec.orb_settings.max_entries_per_session if spec.orb_settings else 2
        if context.session_entries_count >= max_entries:
            result["eligible_for_entry"] = False
            result["reason"] = f"Maximum entries per session ({max_entries}) reached."
            return result

        if spec.risk_limits and spec.risk_limits.prevent_duplicate_entries and context.is_position_open:
            result["eligible_for_entry"] = False
            result["reason"] = "Duplicate entry prevented: position is already open."
            return result

        # 3. Evaluate CALL Entry Tree
        call_tree = spec.call_entry_rules or spec.entry_rules
        if call_tree:
            result["call_entry"] = cls.evaluate_group(call_tree, context)

        # 4. Evaluate PUT Entry Tree
        if spec.put_entry_rules:
            result["put_entry"] = cls.evaluate_group(spec.put_entry_rules, context)

        # 5. Evaluate CALL Exit Tree
        if spec.call_exit_rules:
            result["call_exit"] = cls.evaluate_group(spec.call_exit_rules, context)
        elif spec.exit_rules.exit_conditions:
            result["call_exit"] = cls.evaluate_group(spec.exit_rules.exit_conditions, context)

        # 6. Evaluate PUT Exit Tree
        if spec.put_exit_rules:
            result["put_exit"] = cls.evaluate_group(spec.put_exit_rules, context)

        return result
