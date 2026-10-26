"""AI Strategy Studio orchestration and clarification engine.

Parses natural language trading requests, identifies strategy types (ORB, EMA, RSI, Supertrend, BTST, TSL),
generates dynamic clarification questions, compiles deterministic StrategySpec models with independent
entry/exit timeframes, and provides plain-English explainability analysis.
"""

from __future__ import annotations

import os
import re
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field

from packages.strategy_spec.schema import (
    AdvancedExecutionSpec,
    BreakoutConfirmationMethod,
    BTSTSettingsSpec,
    ConditionGroup,
    ConditionOperand,
    ConditionOperator,
    ConditionRule,
    Exchange,
    ExitRulesSpec,
    IndicatorSpec,
    IndicatorType,
    ORBSettingsSpec,
    PositionSizingMethod,
    PositionSizingSpec,
    RiskLimitsSpec,
    StrategyCategory,
    StrategyDirection,
    StrategyLifecycleState,
    StrategySpec,
    Timeframe,
    TradingMode,
    TSLActivationType,
    TSLDistanceType,
    TSLSettingsSpec,
    create_orb_call_entry_rules,
    create_orb_call_exit_rules,
    create_orb_put_entry_rules,
    create_orb_put_exit_rules,
)
from services.api.services.validation_engine import StrategyValidationEngine, ValidationReport


class ClarificationQuestion(BaseModel):
    """Targeted question when material trading rules are missing or ambiguous."""

    id: str = Field(default_factory=lambda: f"clarify_{uuid4().hex[:6]}")
    category: str
    question: str
    explanation: str
    options: list[str] = Field(default_factory=list)
    suggested_default: str


class ChatMessage(BaseModel):
    """An individual turn in the AI Strategy Studio conversation."""

    id: str = Field(default_factory=lambda: f"msg_{uuid4().hex[:8]}")
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: str | None = None
    clarification_questions: list[ClarificationQuestion] = Field(default_factory=list)
    strategy_spec: StrategySpec | None = None
    validation_report: ValidationReport | None = None


class AIStudioChatResponse(BaseModel):
    """Response returned to the AI Strategy Studio conversation panel."""

    message: ChatMessage
    spec: StrategySpec
    validation: ValidationReport
    how_it_works: list[str]
    failure_modes: list[str]
    ai_provider: str


class AIStudioService:
    """Institutional quantitative rule compiler and dialogue assistant."""

    @classmethod
    def process_prompt(
        cls,
        prompt: str,
        current_spec: StrategySpec | None = None,
        conversation_history: list[ChatMessage] | None = None,
    ) -> AIStudioChatResponse:
        """Process natural language request, extract or refine rules, and return compiled spec."""
        prompt_lower = prompt.lower()
        ai_provider = "TradingWave Deterministic Engine (Local Institutional Mode)"

        # Check if an external LLM key is configured
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key and len(openai_key.strip()) > 10:
            ai_provider = "OpenAI GPT-4o Engine"

        # Initialize base parameters from current_spec if present, or sensible institutional defaults
        if current_spec:
            exchange = current_spec.exchange
            symbol = current_spec.symbol
            timeframe = current_spec.timeframe
            entry_timeframe = current_spec.entry_timeframe
            exit_timeframe = current_spec.exit_timeframe
            trading_mode = current_spec.trading_mode
            direction = current_spec.direction
            trading_session = current_spec.trading_session
            category = current_spec.category
            name = current_spec.name
            orb_settings = current_spec.orb_settings.model_copy()
            btst_settings = current_spec.btst_settings.model_copy()
            tsl_settings = current_spec.tsl_settings.model_copy()
            indicators = list(current_spec.indicators)
            conditions = list(current_spec.entry_rules.conditions)
            exit_rules = current_spec.exit_rules.model_copy()
            pos_sizing = current_spec.position_sizing.model_copy()
            risk_limits = current_spec.risk_limits.model_copy()
            is_refinement = True
        else:
            exchange = Exchange.NSE
            symbol = "NIFTY50"
            timeframe = Timeframe.M15
            entry_timeframe = Timeframe.M5
            exit_timeframe = Timeframe.M1
            trading_mode = TradingMode.INTRADAY
            direction = StrategyDirection.BOTH
            trading_session = "09:15-15:30 IST"
            category = StrategyCategory.MOMENTUM
            name = "NSE NIFTY50 Quantitative Alpha"
            orb_settings = ORBSettingsSpec()
            btst_settings = BTSTSettingsSpec()
            tsl_settings = TSLSettingsSpec()
            indicators = []
            conditions = []
            exit_rules = ExitRulesSpec(
                stop_loss_pct=0.75,
                target_profit_pct=1.75,
                trailing_stop_enabled=False,
                intraday_auto_squareoff="15:15 IST",
                exit_on_opposite_signal=True,
            )
            pos_sizing = PositionSizingSpec(
                method=PositionSizingMethod.FIXED_CAPITAL,
                value=100000.0,
                max_risk_per_trade_pct=1.0,
                allocation_capital_inr=500000.0,
            )
            risk_limits = RiskLimitsSpec(
                max_capital_allocation_inr=500000.0,
                max_open_positions=3,
                daily_loss_limit_inr=15000.0,
                max_order_quantity=1800,
                prevent_duplicate_entries=True,
                entry_cooldown_bars=3,
            )
            is_refinement = False

        # 1. Market & Exchange Extraction
        if any(w in prompt_lower for w in ["crude", "crudeoil", "gold", "silver", "naturalgas", "mcx", "commodity"]):
            exchange = Exchange.MCX
            trading_session = "09:00-23:30 IST"
            if "gold" in prompt_lower:
                symbol = "GOLDM"
            elif "silver" in prompt_lower:
                symbol = "SILVERM"
            elif "gas" in prompt_lower:
                symbol = "NATURALGAS"
            else:
                symbol = "CRUDEOIL"
        elif "bank" in prompt_lower:
            symbol = "BANKNIFTY"
            exchange = Exchange.NSE
            trading_session = "09:15-15:30 IST"
        elif "sensex" in prompt_lower:
            symbol = "SENSEX"
            exchange = Exchange.BSE
            trading_session = "09:15-15:30 IST"
        elif "finnifty" in prompt_lower:
            symbol = "FINNIFTY"
            exchange = Exchange.NSE
            trading_session = "09:15-15:30 IST"
        elif "reliance" in prompt_lower:
            symbol = "RELIANCE"
            exchange = Exchange.NSE
            trading_session = "09:15-15:30 IST"
        elif "tcs" in prompt_lower:
            symbol = "TCS"
            exchange = Exchange.NSE
            trading_session = "09:15-15:30 IST"
        elif "infy" in prompt_lower:
            symbol = "INFY"
            exchange = Exchange.NSE
            trading_session = "09:15-15:30 IST"
        elif "nifty" in prompt_lower and exchange != Exchange.MCX:
            symbol = "NIFTY50"
            exchange = Exchange.NSE
            trading_session = "09:15-15:30 IST"

        # 2. Timeframe Extraction (Base, Entry, Exit)
        tf_match = re.search(r"(\b\d+\b)\s*(?:m|min|minute)", prompt_lower)
        if "1m" in prompt_lower or "1-min" in prompt_lower or "1 minute" in prompt_lower:
            timeframe = Timeframe.M1
        elif "2m" in prompt_lower or "2-min" in prompt_lower or "2 minute" in prompt_lower:
            timeframe = Timeframe.M2
        elif "3m" in prompt_lower or "3-min" in prompt_lower or "3 minute" in prompt_lower:
            timeframe = Timeframe.M3
        elif "5m" in prompt_lower or "5-min" in prompt_lower or "5 minute" in prompt_lower:
            timeframe = Timeframe.M5
        elif "10m" in prompt_lower or "10-min" in prompt_lower or "10 minute" in prompt_lower:
            timeframe = Timeframe.M10
        elif "15m" in prompt_lower or "15-min" in prompt_lower or "15 minute" in prompt_lower:
            timeframe = Timeframe.M15
        elif "16m" in prompt_lower or "16-min" in prompt_lower or "16 minute" in prompt_lower:
            timeframe = Timeframe.M16
        elif "30m" in prompt_lower or "30-min" in prompt_lower or "30 minute" in prompt_lower:
            timeframe = Timeframe.M30
        elif "45m" in prompt_lower or "45-min" in prompt_lower or "45 minute" in prompt_lower:
            timeframe = Timeframe.M45
        elif "1h" in prompt_lower or "60m" in prompt_lower or "hourly" in prompt_lower:
            timeframe = Timeframe.H1
        elif "1d" in prompt_lower or "daily" in prompt_lower:
            timeframe = Timeframe.D1

        # Check explicit "entry timeframe" or "exit timeframe"
        entry_tf_match = re.search(r"entry\s+timeframe\s*(?:is|to|:)?\s*(\d+)\s*(?:m|min|minute)?", prompt_lower)
        if entry_tf_match:
            mins = entry_tf_match.group(1)
            entry_timeframe = Timeframe(f"{mins}m") if f"{mins}m" in [t.value for t in Timeframe] else Timeframe.M5
        else:
            entry_timeframe = timeframe

        exit_tf_match = re.search(r"exit\s+timeframe\s*(?:is|to|:)?\s*(\d+)\s*(?:m|min|minute)?", prompt_lower)
        if exit_tf_match:
            mins = exit_tf_match.group(1)
            exit_timeframe = Timeframe(f"{mins}m") if f"{mins}m" in [t.value for t in Timeframe] else Timeframe.M1

        # Preserve existing trees if present in current_spec
        call_entry_rules = current_spec.call_entry_rules if current_spec else None
        put_entry_rules = current_spec.put_entry_rules if current_spec else None
        call_exit_rules = current_spec.call_exit_rules if current_spec else None
        put_exit_rules = current_spec.put_exit_rules if current_spec else None

        # 3. Strategy Intent Detection: Opening Range Breakout (ORB)
        is_orb = "orb" in prompt_lower or "opening range" in prompt_lower
        if is_orb:
            category = StrategyCategory.ORB
            name = f"{exchange.value} {symbol} Opening Range Breakout"
            orb_settings.enabled = True
            orb_settings.range_start_time = "09:15"
            orb_settings.range_end_time = "09:30"
            orb_settings.entry_start_time = "09:30"
            orb_settings.entry_cutoff_time = "14:30"
            orb_settings.calculation_timeframe = Timeframe.M15
            orb_settings.first_candle_timeframe = Timeframe.M3
            orb_settings.confirmation_method = BreakoutConfirmationMethod.CANDLE_CLOSE
            orb_settings.range_basis = "HIGH_LOW"
            entry_timeframe = Timeframe.M1 if ("1m" in prompt_lower or "1 min" in prompt_lower) else Timeframe.M5
            exit_timeframe = Timeframe.M1

            # Compile canonical CALL entry multi-group rules: (A1 AND A2) OR (B1 AND B2)
            call_entry_rules = create_orb_call_entry_rules(entry_tf=entry_timeframe)
            # Compile canonical PUT entry multi-group rules: (A1 AND A2) OR (B1 AND B2)
            put_entry_rules = create_orb_put_entry_rules(entry_tf=entry_timeframe)
            call_exit_rules = create_orb_call_exit_rules(exit_tf=exit_timeframe)
            put_exit_rules = create_orb_put_exit_rules(exit_tf=exit_timeframe)
            entry_rules = call_entry_rules

        # 4. Strategy Intent Detection: BTST (Buy Today, Sell Tomorrow)
        is_btst = "btst" in prompt_lower or "buy today" in prompt_lower or "sell tomorrow" in prompt_lower
        if is_btst:
            trading_mode = TradingMode.BTST
            btst_settings.enabled = True
            btst_settings.entry_window_start = "15:00"
            btst_settings.entry_window_end = "15:25"
            btst_settings.next_session_exit_start = "09:15"
            btst_settings.next_session_exit_cutoff = "09:30"
            btst_settings.gap_risk_acknowledged = True
            exit_rules.intraday_auto_squareoff = "OVERNIGHT_BTST"

        # 5. Trailing Stop-Loss (TSL) Configuration Detection
        is_tsl = "tsl" in prompt_lower or "trailing" in prompt_lower or "trailing stop" in prompt_lower
        if is_tsl:
            tsl_settings.enabled = True
            # Extract points profit activation e.g. "activate TSL after 20 points"
            act_match = re.search(r"(?:after|at)\s*(\d+(\.\d+)?)\s*points?", prompt_lower)
            if act_match:
                tsl_settings.activation_value = float(act_match.group(1))
                tsl_settings.activation_type = TSLActivationType.POINTS
            # Extract trailing distance e.g. "trail 10 points"
            dist_match = re.search(r"trail(?:ing)?\s*(?:by|of)?\s*(\d+(\.\d+)?)\s*points?", prompt_lower)
            if dist_match:
                tsl_settings.distance_value = float(dist_match.group(1))
                tsl_settings.distance_type = TSLDistanceType.POINTS
            tsl_settings.update_timeframe = exit_timeframe
            tsl_settings.evaluation_candle_offset = -1

        # 6. Technical Indicators & Condition Compilation (Non-ORB)
        if not is_orb and (not is_refinement or any(k in prompt_lower for k in ["build", "create", "enter long", "ema", "rsi", "supertrend"])):
            indicators = []
            conditions = []
            if "supertrend" in prompt_lower:
                st = IndicatorSpec(type=IndicatorType.SUPERTREND, period=10, multiplier=3.0)
                atr = IndicatorSpec(type=IndicatorType.ATR, period=14)
                indicators.extend([st, atr])
                conditions.append(
                    ConditionRule(
                        left=ConditionOperand(type="price_field", price_field="close", offset=-1),
                        operator=ConditionOperator.CROSSES_ABOVE,
                        right=ConditionOperand(type="indicator", indicator_id=st.id, indicator_type=IndicatorType.SUPERTREND, offset=0),
                        description=f"5m candle (-1 close) crosses above Supertrend(10, 3) on {symbol}",
                    )
                )
            elif "ema" in prompt_lower or "crossover" in prompt_lower:
                fast_ema = IndicatorSpec(type=IndicatorType.EMA, period=9)
                slow_ema = IndicatorSpec(type=IndicatorType.EMA, period=21)
                indicators.extend([fast_ema, slow_ema])
                conditions.append(
                    ConditionRule(
                        left=ConditionOperand(type="indicator", indicator_id=fast_ema.id, indicator_type=IndicatorType.EMA, offset=0),
                        operator=ConditionOperator.CROSSES_ABOVE,
                        right=ConditionOperand(type="indicator", indicator_id=slow_ema.id, indicator_type=IndicatorType.EMA, offset=0),
                        description=f"EMA(9) crosses above EMA(21) on {symbol} {timeframe.value}",
                    )
                )
                if "rsi" in prompt_lower:
                    rsi = IndicatorSpec(type=IndicatorType.RSI, period=14)
                    indicators.append(rsi)
                    conditions.append(
                        ConditionRule(
                            left=ConditionOperand(type="indicator", indicator_id=rsi.id, indicator_type=IndicatorType.RSI, offset=0),
                            operator=ConditionOperator.GREATER_THAN,
                            right=ConditionOperand(type="constant", constant_value=50.0),
                            description="RSI(14) > 50 confirming bullish momentum",
                        )
                    )
            elif "rsi" in prompt_lower:
                rsi = IndicatorSpec(type=IndicatorType.RSI, period=14)
                vwap = IndicatorSpec(type=IndicatorType.VWAP)
                indicators.extend([rsi, vwap])
                conditions.append(
                    ConditionRule(
                        left=ConditionOperand(type="indicator", indicator_id=rsi.id, indicator_type=IndicatorType.RSI, offset=-1),
                        operator=ConditionOperator.LESS_THAN,
                        right=ConditionOperand(type="constant", constant_value=30.0),
                        description="RSI(14) < 30 (Oversold condition)",
                    )
                )
                conditions.append(
                    ConditionRule(
                        left=ConditionOperand(type="price_field", price_field="close", offset=0),
                        operator=ConditionOperator.GREATER_THAN,
                        right=ConditionOperand(type="indicator", indicator_id=vwap.id, indicator_type=IndicatorType.VWAP, offset=0),
                        description="Close price above VWAP anchor",
                    )
                )
            else:
                fast_ema = IndicatorSpec(type=IndicatorType.EMA, period=10)
                vwap = IndicatorSpec(type=IndicatorType.VWAP)
                indicators.extend([fast_ema, vwap])
                conditions.append(
                    ConditionRule(
                        left=ConditionOperand(type="price_field", price_field="close", offset=-1),
                        operator=ConditionOperator.CROSSES_ABOVE,
                        right=ConditionOperand(type="indicator", indicator_id=fast_ema.id, indicator_type=IndicatorType.EMA, offset=0),
                        description=f"Close crosses above EMA(10) on {symbol} {timeframe.value}",
                    )
                )

        # 7. Exit Rules & Stop-Loss Refinements
        if "atr" in prompt_lower and ("trailing" in prompt_lower or "stop" in prompt_lower):
            exit_rules.trailing_stop_enabled = True
            exit_rules.trailing_stop_atr_multiplier = 1.5
            exit_rules.trailing_stop_trigger_pct = 1.0
            exit_rules.trailing_stop_step_pct = 0.25
        elif "hard stop" in prompt_lower or "%" in prompt_lower:
            pct_match = re.search(r"(\d+(\.\d+)?)%", prompt_lower)
            if pct_match:
                exit_rules.stop_loss_pct = float(pct_match.group(1))
                exit_rules.trailing_stop_enabled = False

        if "target" in prompt_lower:
            tgt_match = re.search(r"target.*?(\d+(\.\d+)?)%", prompt_lower)
            if tgt_match:
                exit_rules.target_profit_pct = float(tgt_match.group(1))

        if any(w in prompt_lower for w in ["overnight", "nrml", "carryforward", "positional"]):
            exit_rules.intraday_auto_squareoff = "OVERNIGHT_NRML"
            trading_mode = TradingMode.BTST
        elif trading_mode == TradingMode.BTST:
            exit_rules.intraday_auto_squareoff = "OVERNIGHT_BTST"
        elif exchange == Exchange.MCX:
            exit_rules.intraday_auto_squareoff = "23:15 IST"
        else:
            if exit_rules.intraday_auto_squareoff not in ("OVERNIGHT_NRML", "OVERNIGHT_BTST"):
                exit_rules.intraday_auto_squareoff = "15:15 IST"

        if "crosses below" in prompt_lower or "opposite signal" in prompt_lower or "exit when" in prompt_lower:
            exit_rules.exit_on_opposite_signal = True

        # Sizing and Risk limits
        risk_limits.max_open_positions = 2 if exchange == Exchange.MCX else 3
        risk_limits.max_order_quantity = 1800 if symbol == "NIFTY50" else 900 if symbol == "BANKNIFTY" else 100

        spec = StrategySpec(
            id=current_spec.id if current_spec else str(uuid4()),
            name=name,
            description=f"AI-compiled strategy from prompt: '{prompt}'",
            category=category,
            exchange=exchange,
            symbol=symbol,
            timeframe=timeframe,
            entry_timeframe=entry_timeframe,
            exit_timeframe=exit_timeframe,
            trading_mode=trading_mode,
            direction=direction,
            trading_session=trading_session,
            orb_settings=orb_settings,
            btst_settings=btst_settings,
            tsl_settings=tsl_settings,
            indicators=indicators,
            entry_rules=call_entry_rules if is_orb else (current_spec.entry_rules if current_spec and not conditions else ConditionGroup(logic="AND", conditions=conditions)),
            exit_rules=exit_rules,
            call_entry_rules=call_entry_rules,
            put_entry_rules=put_entry_rules,
            call_exit_rules=call_exit_rules,
            put_exit_rules=put_exit_rules,
            position_sizing=pos_sizing,
            risk_limits=risk_limits,
            execution_settings=AdvancedExecutionSpec(
                slippage_pct=0.05,
                include_stt_ctt=True,
                include_exchange_turnover_charges=True,
                include_gst=True,
                brokerage_per_order_inr=20.0,
            ),
            lifecycle_state=StrategyLifecycleState.VALIDATED,
        )

        # 8. Targeted Clarification Questions based on Detected Intent
        clarification_questions: list[ClarificationQuestion] = []
        if is_orb:
            clarification_questions.append(
                ClarificationQuestion(
                    category="Opening Range Window",
                    question=f"Which Opening Range calculation window would you like to enforce on {symbol}?",
                    explanation="Under standard NSE market opening dynamics, the initial 15-minute or 30-minute range establishes early institutional liquidity bounds.",
                    options=["09:15–09:30 (15-min standard)", "09:15–09:45 (30-min confirmed)", "09:15–10:00 (45-min institutional)"],
                    suggested_default="09:15–09:30 (15-min standard)",
                )
            )
            clarification_questions.append(
                ClarificationQuestion(
                    category="Breakout Confirmation",
                    question="Which breakout confirmation method should trigger entries?",
                    explanation="Candle close confirmation reduces false whipsaws, whereas High/Low penetration provides earlier entry execution at higher slippage risk.",
                    options=["Candle Close Confirmation (Recommended)", "High/Low Penetration (Aggressive)", "Retest Confirmation"],
                    suggested_default="Candle Close Confirmation (Recommended)",
                )
            )
            clarification_questions.append(
                ClarificationQuestion(
                    category="Trading Mode",
                    question="What is your desired trading mode for this ORB setup?",
                    explanation="Intraday positions square off automatically before market close, while BTST carries overnight with auction gap risk.",
                    options=["Intraday MIS (Mandatory 15:15 IST Square-off)", "BTST Positional (Carry overnight to next session)"],
                    suggested_default="Intraday MIS (Mandatory 15:15 IST Square-off)",
                )
            )
        else:
            if "stop loss" not in prompt_lower and "sl" not in prompt_lower and "risk" not in prompt_lower and not is_refinement:
                clarification_questions.append(
                    ClarificationQuestion(
                        category="Risk Control",
                        question="What Stop Loss rule would you like to enforce for capital protection?",
                        explanation="No explicit stop loss was mentioned in your prompt. Setting a strict stop loss prevents unquantified downside risk.",
                        options=["0.5% Hard Stop Loss", "1.0% Hard Stop Loss", "1.5× ATR Trailing Stop Loss", "Leave at default 0.75%"],
                        suggested_default="0.75% Hard Stop Loss",
                    )
                )

        # 9. Run Deterministic Validation Engine
        validation_report = StrategyValidationEngine.validate(spec)

        # 10. Generate Explainability: "How It Works" & "Potential Failure Modes"
        if is_orb:
            how_it_works = [
                f"1. Monitors {symbol} on {exchange.value}. Defines the opening range between {orb_settings.range_start_time} and {orb_settings.range_end_time} IST.",
                f"2. Evaluates entry rules on {entry_timeframe.value} candles starting strictly after {orb_settings.entry_start_time} IST.",
                f"3. Long Entry triggers when completed {entry_timeframe.value} candle close crosses above ORB High; Short Entry triggers below ORB Low.",
                f"4. Exits are monitored on independent {exit_timeframe.value} bars with stop loss at {exit_rules.stop_loss_pct or 0.75}% and profit target at {exit_rules.target_profit_pct}%.",
                f"5. Enforces mandatory auto square-off at {exit_rules.intraday_auto_squareoff} and checks ₹{risk_limits.daily_loss_limit_inr:,.0f} daily loss limit.",
            ]
            failure_modes = [
                "Morning Opening Whipsaws: High early-session volatility can produce false penetrations of the range before reversing.",
                "Abnormally Wide Opening Range: If the first 15 minutes experience extreme news expansion, subsequent risk:reward becomes unfavorable.",
                "Choppy / Sideways Regimes: When market remains range-bound between ORB High and Low, no breakout triggers are generated.",
                "Slippage on Breakout Candles: Market orders triggered on breakout candles may encounter wider spreads during rapid index moves.",
            ]
        else:
            how_it_works = [
                f"1. Monitors {symbol} on {exchange.value} using {timeframe.value} candlestick bars during {trading_session}.",
                f"2. Evaluates entry condition(s) on candle close confirmation: {', '.join(c.description or c.id for c in conditions)}.",
                f"3. Sizing calculated using {pos_sizing.method.value} (₹{pos_sizing.value:,.0f} cap).",
                f"4. Exit logic monitored on {exit_timeframe.value} timeframe with stop loss ({'1.5× ATR Trailing' if exit_rules.trailing_stop_enabled else f'{exit_rules.stop_loss_pct}%'}) and target {exit_rules.target_profit_pct}%.",
                f"5. Enforces auto square-off ({exit_rules.intraday_auto_squareoff}) and ₹{risk_limits.daily_loss_limit_inr:,.0f} daily loss circuit limit.",
            ]
            failure_modes = [
                "Whipsaws in Choppy Regimes: Moving average crossovers generate consecutive stop-losses when trend is absent.",
                "Overnight Gap Risk: Positional holding carries exposure to global market gap-downs through opening auctions.",
                "Statutory Drag: High-frequency round-trips incur cumulative STT/CTT, turnover fees, and GST that erode net returns.",
            ]

        assistant_text = (
            f"I have detected your trading intent (**{category.value}** on `{exchange.value}:{symbol}`) and generated a complete, editable configuration.\n\n"
            f"• **Strategy Type:** `{category.value}` ({trading_mode.value})\n"
            f"• **Timeframes:** Entry `{entry_timeframe.value}`, Exit `{exit_timeframe.value}`\n"
            f"• **ORB Window:** `{orb_settings.range_start_time} - {orb_settings.range_end_time} IST` (Calculation `{orb_settings.calculation_timeframe.value}`)\n"
            f"• **Risk Stops:** Stop Loss `{exit_rules.stop_loss_pct or 0.75}%`, Target `{exit_rules.target_profit_pct}%`, Cutoff `{exit_rules.intraday_auto_squareoff}`\n\n"
            f"The central rule builder panel has automatically displayed all relevant ORB, Timeframe, Condition, and TSL controls. "
            "You can edit the parameters directly in the center tabs, answer clarification questions, or validate for backtesting."
        )

        chat_message = ChatMessage(
            role="assistant",
            content=assistant_text,
            clarification_questions=clarification_questions,
            strategy_spec=spec,
            validation_report=validation_report,
        )

        return AIStudioChatResponse(
            message=chat_message,
            spec=spec,
            validation=validation_report,
            how_it_works=how_it_works,
            failure_modes=failure_modes,
            ai_provider=ai_provider,
        )
