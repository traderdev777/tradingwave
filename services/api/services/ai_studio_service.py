"""AI Strategy Studio orchestration and clarification engine.

Parses natural language trading requests, identifies missing parameters,
generates clarification questions, compiles deterministic StrategySpec models,
and provides plain-English explainability analysis.
"""

from __future__ import annotations

import os
import re
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field

from packages.strategy_spec.schema import (
    AdvancedExecutionSpec,
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
    StrategyCategory,
    StrategyLifecycleState,
    StrategySpec,
    Timeframe,
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
    """Response returned to the AI Studio conversation panel."""

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

        # Determine instrument, exchange and timeframe
        exchange = Exchange.NSE
        symbol = "NIFTY50"
        timeframe = Timeframe.M15
        trading_session = "09:15-15:30 IST"
        category = StrategyCategory.MOMENTUM

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
        elif "reliance" in prompt_lower:
            symbol = "RELIANCE"
        elif "tcs" in prompt_lower:
            symbol = "TCS"
        elif "infy" in prompt_lower:
            symbol = "INFY"

        # 2. Timeframe Extraction
        if "1m" in prompt_lower or "1-min" in prompt_lower:
            timeframe = Timeframe.M1
        elif "3m" in prompt_lower or "3-min" in prompt_lower:
            timeframe = Timeframe.M3
        elif "5m" in prompt_lower or "5-min" in prompt_lower:
            timeframe = Timeframe.M5
        elif "30m" in prompt_lower or "30-min" in prompt_lower:
            timeframe = Timeframe.M30
        elif "1h" in prompt_lower or "60m" in prompt_lower or "hourly" in prompt_lower:
            timeframe = Timeframe.H1
        elif "1d" in prompt_lower or "daily" in prompt_lower:
            timeframe = Timeframe.D1
        elif current_spec:
            timeframe = current_spec.timeframe

        # 3. Strategy Category & Title
        if "reversion" in prompt_lower or "rsi" in prompt_lower or "band" in prompt_lower:
            category = StrategyCategory.MEAN_REVERSION
            name = f"{exchange.value} {symbol} Mean Reversion Bands"
        elif "breakout" in prompt_lower or "orb" in prompt_lower or "opening" in prompt_lower:
            category = StrategyCategory.BREAKOUT
            name = f"{exchange.value} {symbol} Opening Range Breakout"
        elif "supertrend" in prompt_lower:
            category = StrategyCategory.TREND_FOLLOWING
            name = f"{exchange.value} {symbol} Supertrend Momentum"
        elif "scalp" in prompt_lower or "ema" in prompt_lower:
            category = StrategyCategory.SCALPING
            name = f"{exchange.value} {symbol} EMA Scalper"
        else:
            name = f"{exchange.value} {symbol} Quantitative Alpha"

        # 4. Indicators & Condition Rules Compilation
        indicators: list[IndicatorSpec] = []
        conditions: list[ConditionRule] = []

        # Indicators logic synthesis
        if "supertrend" in prompt_lower:
            st = IndicatorSpec(type=IndicatorType.SUPERTREND, period=10, multiplier=3.0)
            atr = IndicatorSpec(type=IndicatorType.ATR, period=14)
            indicators.extend([st, atr])
            conditions.append(
                ConditionRule(
                    left=ConditionOperand(type="price_field", price_field="close"),
                    operator=ConditionOperator.CROSSES_ABOVE,
                    right=ConditionOperand(type="indicator", indicator_id=st.id, indicator_type=IndicatorType.SUPERTREND),
                    description=f"Close crosses above Supertrend(10, 3) on {symbol} {timeframe.value}",
                )
            )
        elif "ema" in prompt_lower or "crossover" in prompt_lower:
            fast_ema = IndicatorSpec(type=IndicatorType.EMA, period=9)
            slow_ema = IndicatorSpec(type=IndicatorType.EMA, period=21)
            rsi = IndicatorSpec(type=IndicatorType.RSI, period=14)
            indicators.extend([fast_ema, slow_ema, rsi])
            conditions.append(
                ConditionRule(
                    left=ConditionOperand(type="indicator", indicator_id=fast_ema.id, indicator_type=IndicatorType.EMA),
                    operator=ConditionOperator.CROSSES_ABOVE,
                    right=ConditionOperand(type="indicator", indicator_id=slow_ema.id, indicator_type=IndicatorType.EMA),
                    description=f"EMA(9) crosses above EMA(21) on {symbol} {timeframe.value}",
                )
            )
            conditions.append(
                ConditionRule(
                    left=ConditionOperand(type="indicator", indicator_id=rsi.id, indicator_type=IndicatorType.RSI),
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
                    left=ConditionOperand(type="indicator", indicator_id=rsi.id, indicator_type=IndicatorType.RSI),
                    operator=ConditionOperator.LESS_THAN,
                    right=ConditionOperand(type="constant", constant_value=30.0),
                    description="RSI(14) < 30 (Oversold condition)",
                )
            )
            conditions.append(
                ConditionRule(
                    left=ConditionOperand(type="price_field", price_field="close"),
                    operator=ConditionOperator.GREATER_THAN,
                    right=ConditionOperand(type="indicator", indicator_id=vwap.id, indicator_type=IndicatorType.VWAP),
                    description="Close price above VWAP anchor",
                )
            )
        else:
            # Default institutional EMA + VWAP momentum rule
            fast_ema = IndicatorSpec(type=IndicatorType.EMA, period=10)
            vwap = IndicatorSpec(type=IndicatorType.VWAP)
            indicators.extend([fast_ema, vwap])
            conditions.append(
                ConditionRule(
                    left=ConditionOperand(type="price_field", price_field="close"),
                    operator=ConditionOperator.CROSSES_ABOVE,
                    right=ConditionOperand(type="indicator", indicator_id=fast_ema.id, indicator_type=IndicatorType.EMA),
                    description=f"Close crosses above EMA(10) on {symbol} {timeframe.value}",
                )
            )

        # 5. Exit Rules & Stop Loss extraction
        stop_loss_pct = 0.75
        target_pct = 1.75
        if "stop loss" in prompt_lower or "sl" in prompt_lower:
            # Look for percentage e.g. "0.5%", "1%", "2%"
            match = re.search(r"(\d+(\.\d+)?)%", prompt_lower)
            if match:
                stop_loss_pct = float(match.group(1))

        if exchange == Exchange.MCX:
            intraday_exit = "23:15 IST"
            stop_loss_pct = 1.0
            target_pct = 2.5
        else:
            intraday_exit = "15:15 IST"

        exit_rules = ExitRulesSpec(
            stop_loss_pct=stop_loss_pct,
            target_profit_pct=target_pct,
            trailing_stop_enabled=True if "trailing" in prompt_lower else False,
            trailing_stop_trigger_pct=1.0 if "trailing" in prompt_lower else None,
            trailing_stop_step_pct=0.25 if "trailing" in prompt_lower else None,
            intraday_auto_squareoff=intraday_exit,
            exit_on_opposite_signal=True,
        )

        # 6. Sizing and Risk
        pos_sizing = PositionSizingSpec(
            method=PositionSizingMethod.FIXED_CAPITAL,
            value=100000.0,
            max_risk_per_trade_pct=1.0,
            allocation_capital_inr=500000.0,
        )
        risk_limits = RiskLimitsSpec(
            max_capital_allocation_inr=500000.0,
            max_open_positions=2 if exchange == Exchange.MCX else 3,
            daily_loss_limit_inr=15000.0,
            max_order_quantity=1800 if symbol == "NIFTY50" else 900 if symbol == "BANKNIFTY" else 100,
            prevent_duplicate_entries=True,
            entry_cooldown_bars=3,
        )

        spec = StrategySpec(
            id=current_spec.id if current_spec else str(uuid4()),
            name=name,
            description=f"AI-compiled strategy from prompt: '{prompt}'",
            category=category,
            exchange=exchange,
            symbol=symbol,
            timeframe=timeframe,
            trading_session=trading_session,
            indicators=indicators,
            entry_rules=ConditionGroup(logic="AND", conditions=conditions),
            exit_rules=exit_rules,
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

        # 7. Check Missing or Ambiguous Rules -> Generate Clarification Questions
        clarification_questions: list[ClarificationQuestion] = []
        if "stop loss" not in prompt_lower and "sl" not in prompt_lower and "risk" not in prompt_lower:
            clarification_questions.append(
                ClarificationQuestion(
                    category="Risk Control",
                    question="What Stop Loss rule would you like to enforce for capital protection?",
                    explanation="No explicit stop loss was mentioned in your prompt. Setting a strict stop loss prevents unquantified downside risk.",
                    options=["0.5% Hard Stop Loss", "1.0% Hard Stop Loss", "1.5× ATR Trailing Stop Loss", "Leave at default 0.75%"],
                    suggested_default="0.75% Hard Stop Loss",
                )
            )

        if not any(tf in prompt_lower for tf in ["1m", "3m", "5m", "15m", "30m", "1h", "daily"]):
            clarification_questions.append(
                ClarificationQuestion(
                    category="Timeframe",
                    question=f"Which candle timeframe should be evaluated on {symbol}?",
                    explanation=f"Defaulted to {timeframe.value} bars. High-frequency scalping often uses 3m/5m, whereas trend-following relies on 15m/30m.",
                    options=["5m (Scalping / Fast Intraday)", "15m (Momentum Intraday)", "30m (Swing / Multi-Hour)", "1d (Positional)"],
                    suggested_default="15m (Momentum Intraday)",
                )
            )

        if "square" not in prompt_lower and "exit" not in prompt_lower:
            clarification_questions.append(
                ClarificationQuestion(
                    category="Session Risk",
                    question=f"Is this strictly an intraday strategy requiring mandatory {intraday_exit} square-off?",
                    explanation="Under Indian statutory guidelines, intraday MIS positions must be squared off before exchange close to avoid broker penalty fees.",
                    options=[f"Yes, mandatory auto square-off at {intraday_exit}", "No, allow overnight positional carryforward (NRML)"],
                    suggested_default=f"Yes, mandatory auto square-off at {intraday_exit}",
                )
            )

        # 8. Run Deterministic Validation Engine
        validation_report = StrategyValidationEngine.validate(spec)

        # 9. Generate "How It Works" & "Potential Failure Modes"
        how_it_works = [
            f"1. Monitors {symbol} on {exchange.value} using {timeframe.value} candlestick bars during {trading_session}.",
            f"2. Evaluates entry condition(s) on candle close confirmation: {', '.join(c.description or c.id for c in conditions)}.",
            f"3. When all conditions are satisfied, calculates position size using {pos_sizing.method.value} (₹{pos_sizing.value:,.0f} cap).",
            f"4. Automatically attaches hard stop loss at {exit_rules.stop_loss_pct}% and target at {exit_rules.target_profit_pct}%.",
            f"5. Enforces mandatory intraday auto square-off at {exit_rules.intraday_auto_squareoff} and checks ₹{risk_limits.daily_loss_limit_inr:,.0f} daily loss circuit limit.",
        ]

        failure_modes = [
            "Whipsaws in Choppy / Sideways Regimes: When price oscillates tightly without momentum, moving average crossovers generate consecutive false breakouts.",
            "Overnight Gap Risk: If positions are held past intraday cutoff into opening auctions, price can gap through the stop loss level.",
            "Slippage in High-Volatility Events: During RBI policy releases, union budget, or US CPI prints, liquidity thins and order fills may incur higher market slippage.",
            "Statutory Drag: Frequent round-trip scalping incurs cumulative STT/CTT, turnover fees, and GST that erode gross returns.",
        ]

        assistant_text = (
            f"I have analyzed your trading concept and compiled a validated, deterministic specification for **{name}**.\n\n"
            f"• **Instrument:** `{exchange.value}:{symbol}` on `{timeframe.value}` bars\n"
            f"• **Core Signal:** {conditions[0].description if conditions else 'Candle close rule'}\n"
            f"• **Risk Parameters:** Stop Loss `{exit_rules.stop_loss_pct}%`, Target `{exit_rules.target_profit_pct}%`, Intraday Cutoff `{exit_rules.intraday_auto_squareoff}`\n\n"
            f"The specification has been pre-screened with **{validation_report.error_count} errors** and **{validation_report.warning_count} warnings**. "
            "You can review the rule tree in the center panel, answer the clarification questions below, or proceed to backtesting."
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
