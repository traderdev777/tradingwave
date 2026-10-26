"""TradingWave Canonical Strategy Template Catalog.

Provides production-grade, engine-validated strategy templates across:
1. Opening Range Breakout (ORB)
2. Trend Following
3. Momentum
4. Mean Reversion
5. BTST (Buy Today Sell Tomorrow)

Each template is a reusable starting configuration conforming strictly to canonical StrategySpec AST.
"""

from dataclasses import dataclass, field
from typing import Any
from pydantic import BaseModel, Field

from packages.strategy_spec.schema import (
    AdvancedExecutionSpec,
    BTSTSettingsSpec,
    BreakoutConfirmationMethod,
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
    ProfitTargetMethod,
    RiskLimitsSpec,
    StopLossMethod,
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
    create_orb_put_entry_rules,
    create_orb_call_exit_rules,
    create_orb_put_exit_rules,
)


class StrategyTemplate(BaseModel):
    """Template model metadata and embedded canonical specification."""

    template_id: str
    name: str
    description: str
    category: StrategyCategory
    supported_instruments: list[str]
    supported_timeframes: list[str]
    trading_mode: TradingMode = TradingMode.INTRADAY
    tags: list[str] = Field(default_factory=list)
    entry_logic_summary: str
    exit_logic_summary: str
    risk_settings_summary: str
    required_data: str
    known_limitations: str
    template_version: str = "1.0.0"
    backtest_disclaimer: str = (
        "This template is an unoptimized baseline starting point. Past performance does not guarantee future results. "
        "Always perform historical backtesting with Indian statutory STT, exchange turnover fees, and slippage before deploying."
    )
    spec: StrategySpec


def _build_standard_risk_limits() -> RiskLimitsSpec:
    return RiskLimitsSpec(
        max_capital_allocation_inr=100000.0,
        max_open_positions=1,
        daily_loss_limit_inr=5000.0,
        max_order_quantity=1800,
        allowed_trading_days=["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        prevent_duplicate_entries=True,
        entry_cooldown_bars=2,
    )


def _build_standard_position_sizing(qty: int = 50) -> PositionSizingSpec:
    return PositionSizingSpec(
        method=PositionSizingMethod.FIXED_QUANTITY,
        value=qty,
        max_risk_per_trade_pct=1.0,
        allocation_capital_inr=50000.0,
    )


# ----------------------------------------------------------------------------------
# TEMPLATE 1: Basic ORB (15-Minute Range Breakout)
# ----------------------------------------------------------------------------------
def get_basic_orb_template() -> StrategyTemplate:
    call_entry = ConditionGroup(
        id="grp_basic_orb_call",
        logic="AND",
        conditions=[
            ConditionRule(
                id="c_orb_c1",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_high"),
                description="Previous candle close is above ORB High",
            )
        ],
    )
    put_entry = ConditionGroup(
        id="grp_basic_orb_put",
        logic="AND",
        conditions=[
            ConditionRule(
                id="c_orb_p1",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1),
                operator=ConditionOperator.LESS_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_low"),
                description="Previous candle close is below ORB Low",
            )
        ],
    )

    spec = StrategySpec(
        id="strat_tmpl_orb_basic",
        name="NSE NIFTY 15m Basic Opening Range Breakout",
        description="Classic opening range breakout trading breakouts above the 09:15-09:30 range high or below the range low.",
        category=StrategyCategory.ORB,
        exchange=Exchange.NSE,
        symbol="NIFTY50",
        timeframe=Timeframe.M15,
        entry_timeframe=Timeframe.M5,
        exit_timeframe=Timeframe.M1,
        trading_mode=TradingMode.INTRADAY,
        direction=StrategyDirection.BOTH,
        trading_session="09:15-15:30 IST",
        orb_settings=ORBSettingsSpec(
            enabled=True,
            range_start_time="09:15",
            range_end_time="09:30",
            entry_start_time="09:30",
            entry_cutoff_time="14:30",
            calculation_timeframe=Timeframe.M15,
            first_candle_timeframe=Timeframe.M3,
            confirmation_method=BreakoutConfirmationMethod.CANDLE_CLOSE,
            breakout_buffer_pct=0.05,
            one_entry_per_breakout=True,
            max_entries_per_session=2,
            range_basis="HIGH_LOW",
        ),
        indicators=[],
        entry_rules=call_entry,
        exit_rules=ExitRulesSpec(
            stop_loss_method=StopLossMethod.FIXED_POINTS,
            stop_loss_points=30.0,
            profit_target_method=ProfitTargetMethod.FIXED_POINTS,
            target_profit_points=60.0,
            trailing_stop_enabled=False,
            intraday_auto_squareoff="15:15",
            exit_on_opposite_signal=True,
        ),
        call_entry_rules=call_entry,
        put_entry_rules=put_entry,
        position_sizing=_build_standard_position_sizing(50),
        risk_limits=_build_standard_risk_limits(),
        execution_settings=AdvancedExecutionSpec(),
        lifecycle_state=StrategyLifecycleState.DRAFT,
    )

    return StrategyTemplate(
        template_id="tmpl_orb_basic",
        name="Basic 15m Opening Range Breakout",
        description="Detects breakout beyond initial 15-minute high or low with strict candle-close confirmation.",
        category=StrategyCategory.ORB,
        supported_instruments=["NIFTY50", "BANKNIFTY", "FINNIFTY", "SENSEX", "RELIANCE"],
        supported_timeframes=["5m", "15m"],
        trading_mode=TradingMode.INTRADAY,
        tags=["ORB", "Intraday", "Breakout", "NIFTY"],
        entry_logic_summary="Enter LONG when 5m candle closes > ORB High; enter SHORT when 5m candle closes < ORB Low.",
        exit_logic_summary="30-point stop loss, 60-point target (1:2 R/R), mandatory 15:15 IST intraday square-off.",
        risk_settings_summary="Max 1 position, 2 entries per session, ₹5,000 daily loss limit.",
        required_data="NSE 1m/5m historical candlestick feed with 09:15 session open.",
        known_limitations="Can incur whipsaws in rangebound, low-volatility opening sessions without volume filters.",
        spec=spec,
    )


# ----------------------------------------------------------------------------------
# TEMPLATE 2: Multi-Condition ORB with Nested (A1 AND A2) OR (B1 AND B2) Groups
# ----------------------------------------------------------------------------------
def get_multigroup_orb_template() -> StrategyTemplate:
    call_entry = create_orb_call_entry_rules(entry_tf=Timeframe.M5)
    put_entry = create_orb_put_entry_rules(entry_tf=Timeframe.M5)
    call_exit = create_orb_call_exit_rules()
    put_exit = create_orb_put_exit_rules()

    spec = StrategySpec(
        id="strat_tmpl_orb_multigroup",
        name="NSE NIFTY Multi-Group Institutional ORB",
        description="Institutional ORB condition engine implementing separate CALL (Breakout OR Bounce) and PUT (Breakdown OR Rejection) logic trees.",
        category=StrategyCategory.ORB,
        exchange=Exchange.NSE,
        symbol="NIFTY50",
        timeframe=Timeframe.M15,
        entry_timeframe=Timeframe.M5,
        exit_timeframe=Timeframe.M1,
        trading_mode=TradingMode.INTRADAY,
        direction=StrategyDirection.BOTH,
        trading_session="09:15-15:30 IST",
        orb_settings=ORBSettingsSpec(
            enabled=True,
            range_start_time="09:15",
            range_end_time="09:30",
            entry_start_time="09:30",
            entry_cutoff_time="14:30",
            calculation_timeframe=Timeframe.M15,
            first_candle_timeframe=Timeframe.M3,
            confirmation_method=BreakoutConfirmationMethod.CANDLE_CLOSE,
            breakout_buffer_pct=0.1,
            one_entry_per_breakout=True,
            max_entries_per_session=2,
            range_basis="HIGH_LOW",
        ),
        tsl_settings=TSLSettingsSpec(
            enabled=True,
            activation_type=TSLActivationType.POINTS,
            activation_value=25.0,
            distance_type=TSLDistanceType.POINTS,
            distance_value=12.0,
            step_value=5.0,
            atr_multiplier=1.5,
            update_timeframe=Timeframe.M1,
            evaluation_candle_offset=-1,
            lock_profit_at_activation=True,
        ),
        indicators=[],
        entry_rules=call_entry,
        exit_rules=ExitRulesSpec(
            stop_loss_method=StopLossMethod.FIXED_POINTS,
            stop_loss_points=35.0,
            profit_target_method=ProfitTargetMethod.FIXED_POINTS,
            target_profit_points=70.0,
            trailing_stop_enabled=True,
            intraday_auto_squareoff="15:15",
            exit_on_opposite_signal=True,
        ),
        call_entry_rules=call_entry,
        put_entry_rules=put_entry,
        call_exit_rules=call_exit,
        put_exit_rules=put_exit,
        position_sizing=_build_standard_position_sizing(50),
        risk_limits=_build_standard_risk_limits(),
        execution_settings=AdvancedExecutionSpec(),
        lifecycle_state=StrategyLifecycleState.DRAFT,
    )

    return StrategyTemplate(
        template_id="tmpl_orb_multigroup",
        name="Multi-Group Institutional ORB ((A1 & A2) OR (B1 & B2))",
        description="Two-group boolean breakout architecture evaluating both range boundary breakouts and midpoint bounces.",
        category=StrategyCategory.ORB,
        supported_instruments=["NIFTY50", "BANKNIFTY", "FINNIFTY", "SENSEX"],
        supported_timeframes=["3m", "5m", "15m"],
        trading_mode=TradingMode.INTRADAY,
        tags=["ORB", "Multi-Group", "Institutional", "TSL"],
        entry_logic_summary="CALL: (t-2 close < ORB High AND t-1 close > ORB High) OR (t-2 close < ORB Low AND t-1 close > ORB Low). PUT: Inverse.",
        exit_logic_summary="35-pt SL, 70-pt target, 25-pt TSL ratchet trailing 12 pts behind peak.",
        risk_settings_summary="Strict 2 entries per session, one entry per breakout side, 15:15 IST auto square-off.",
        required_data="Multi-timeframe candlestick feeds (15m window calc, 5m entry trigger).",
        known_limitations="Requires continuous market data connectivity for trailing stop evaluation.",
        spec=spec,
    )


# ----------------------------------------------------------------------------------
# TEMPLATE 3: ORB with Trend Filter (EMA 50 & 200)
# ----------------------------------------------------------------------------------
def get_orb_trend_filter_template() -> StrategyTemplate:
    ema50 = IndicatorSpec(id="ind_ema50", type=IndicatorType.EMA, period=50, source="close")
    ema200 = IndicatorSpec(id="ind_ema200", type=IndicatorType.EMA, period=200, source="close")

    call_entry = ConditionGroup(
        id="grp_orb_trend_call",
        logic="AND",
        conditions=[
            ConditionRule(
                id="c_ot_1",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="price_field", price_field="orb_high"),
                description="Previous close > ORB High",
            ),
            ConditionRule(
                id="c_ot_2",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="indicator", indicator_id=ema50.id, indicator_type=IndicatorType.EMA),
                description="Previous close > 50 EMA (Bullish Trend Filter)",
            ),
        ],
    )

    spec = StrategySpec(
        id="strat_tmpl_orb_trend",
        name="NSE NIFTY ORB with 50 EMA Trend Filter",
        description="Filters opening range breakout trades to align strictly with the prevailing intraday 50 EMA trend.",
        category=StrategyCategory.ORB,
        exchange=Exchange.NSE,
        symbol="NIFTY50",
        timeframe=Timeframe.M15,
        entry_timeframe=Timeframe.M5,
        exit_timeframe=Timeframe.M1,
        trading_mode=TradingMode.INTRADAY,
        direction=StrategyDirection.LONG,
        trading_session="09:15-15:30 IST",
        orb_settings=ORBSettingsSpec(
            enabled=True,
            range_start_time="09:15",
            range_end_time="09:30",
            entry_start_time="09:30",
            entry_cutoff_time="14:00",
            calculation_timeframe=Timeframe.M15,
            first_candle_timeframe=Timeframe.M3,
            confirmation_method=BreakoutConfirmationMethod.CANDLE_CLOSE,
        ),
        indicators=[ema50, ema200],
        entry_rules=call_entry,
        exit_rules=ExitRulesSpec(
            stop_loss_method=StopLossMethod.FIXED_POINTS,
            stop_loss_points=25.0,
            profit_target_method=ProfitTargetMethod.FIXED_POINTS,
            target_profit_points=50.0,
            trailing_stop_enabled=False,
            intraday_auto_squareoff="15:15",
            exit_on_opposite_signal=False,
        ),
        call_entry_rules=call_entry,
        position_sizing=_build_standard_position_sizing(50),
        risk_limits=_build_standard_risk_limits(),
        execution_settings=AdvancedExecutionSpec(),
        lifecycle_state=StrategyLifecycleState.DRAFT,
    )

    return StrategyTemplate(
        template_id="tmpl_orb_trend_filter",
        name="ORB with 50 EMA Trend Filter",
        description="Opening range breakout requiring price to trade in the direction of the 50-period EMA to reduce counter-trend false breakouts.",
        category=StrategyCategory.ORB,
        supported_instruments=["NIFTY50", "BANKNIFTY", "RELIANCE", "TCS", "INFY"],
        supported_timeframes=["5m", "15m"],
        trading_mode=TradingMode.INTRADAY,
        tags=["ORB", "EMA", "Trend Filter", "Long Only"],
        entry_logic_summary="LONG when 5m candle close > ORB High AND close > 50 EMA.",
        exit_logic_summary="25-point stop loss, 50-point target, 15:15 IST auto square-off.",
        risk_settings_summary="Max 1 open position, 14:00 IST entry cutoff.",
        required_data="NSE historical bars with sufficient warm-up period for 50/200 EMA.",
        known_limitations="Requires minimum 200 bars historical warm-up for indicator calculation.",
        spec=spec,
    )


# ----------------------------------------------------------------------------------
# TEMPLATE 4: Trend Following: EMA 9 / 21 Crossover
# ----------------------------------------------------------------------------------
def get_ema_crossover_template() -> StrategyTemplate:
    fast_ema = IndicatorSpec(id="ind_ema9", type=IndicatorType.EMA, period=9, source="close")
    slow_ema = IndicatorSpec(id="ind_ema21", type=IndicatorType.EMA, period=21, source="close")

    entry_rules = ConditionGroup(
        id="grp_ema_cross_entry",
        logic="AND",
        conditions=[
            ConditionRule(
                id="c_ema_1",
                left=ConditionOperand(type="indicator", indicator_id=fast_ema.id, indicator_type=IndicatorType.EMA, offset=0),
                operator=ConditionOperator.CROSSES_ABOVE,
                right=ConditionOperand(type="indicator", indicator_id=slow_ema.id, indicator_type=IndicatorType.EMA, offset=0),
                description="Fast EMA(9) crosses above Slow EMA(21)",
            )
        ],
    )

    exit_conditions = ConditionGroup(
        id="grp_ema_cross_exit",
        logic="AND",
        conditions=[
            ConditionRule(
                id="c_ema_exit_1",
                left=ConditionOperand(type="indicator", indicator_id=fast_ema.id, indicator_type=IndicatorType.EMA, offset=0),
                operator=ConditionOperator.CROSSES_BELOW,
                right=ConditionOperand(type="indicator", indicator_id=slow_ema.id, indicator_type=IndicatorType.EMA, offset=0),
                description="Fast EMA(9) crosses below Slow EMA(21)",
            )
        ],
    )

    spec = StrategySpec(
        id="strat_tmpl_ema_cross",
        name="NSE NIFTY 5m EMA (9/21) Trend Following",
        description="Momentum-trend following system entering long on EMA 9/21 bullish crossover and exiting on bearish crossover.",
        category=StrategyCategory.TREND_FOLLOWING,
        exchange=Exchange.NSE,
        symbol="NIFTY50",
        timeframe=Timeframe.M5,
        entry_timeframe=Timeframe.M5,
        exit_timeframe=Timeframe.M5,
        trading_mode=TradingMode.INTRADAY,
        direction=StrategyDirection.LONG,
        trading_session="09:15-15:30 IST",
        indicators=[fast_ema, slow_ema],
        entry_rules=entry_rules,
        exit_rules=ExitRulesSpec(
            stop_loss_method=StopLossMethod.PERCENTAGE,
            stop_loss_pct=0.5,
            profit_target_method=ProfitTargetMethod.PERCENTAGE,
            target_profit_pct=1.0,
            trailing_stop_enabled=False,
            intraday_auto_squareoff="15:15",
            exit_on_opposite_signal=True,
            exit_conditions=exit_conditions,
        ),
        position_sizing=_build_standard_position_sizing(50),
        risk_limits=_build_standard_risk_limits(),
        execution_settings=AdvancedExecutionSpec(),
        lifecycle_state=StrategyLifecycleState.DRAFT,
    )

    return StrategyTemplate(
        template_id="tmpl_ema_crossover",
        name="EMA (9/21) Dynamic Trend Crossover",
        description="Standard quantitative moving average crossover capturing medium-duration intraday trending moves.",
        category=StrategyCategory.TREND_FOLLOWING,
        supported_instruments=["NIFTY50", "BANKNIFTY", "RELIANCE", "TCS", "HDFCBANK"],
        supported_timeframes=["3m", "5m", "15m"],
        trading_mode=TradingMode.INTRADAY,
        tags=["Trend Following", "EMA", "Crossover", "5m"],
        entry_logic_summary="LONG on 5m EMA(9) crossing above EMA(21).",
        exit_logic_summary="0.5% Stop Loss, 1.0% Profit Target, or early exit when EMA(9) crosses below EMA(21).",
        risk_settings_summary="Fixed 50 qty, 1% trade risk allocation, 15:15 auto square-off.",
        required_data="NSE 5m intraday OHLCV bars.",
        known_limitations="Prone to frequent false triggers during sideways, consolidating market regimes.",
        spec=spec,
    )


# ----------------------------------------------------------------------------------
# TEMPLATE 5: Supertrend (10, 3.0) Multi-Timeframe Trend Following
# ----------------------------------------------------------------------------------
def get_supertrend_template() -> StrategyTemplate:
    st = IndicatorSpec(
        id="ind_st10_3",
        type=IndicatorType.SUPERTREND,
        period=10,
        multiplier=3.0,
        source="close",
    )

    entry_rules = ConditionGroup(
        id="grp_st_entry",
        logic="AND",
        conditions=[
            ConditionRule(
                id="c_st_1",
                left=ConditionOperand(type="price_field", price_field="close", offset=0),
                operator=ConditionOperator.CROSSES_ABOVE,
                right=ConditionOperand(type="indicator", indicator_id=st.id, indicator_type=IndicatorType.SUPERTREND),
                description="Candle close crosses above Supertrend line",
            )
        ],
    )

    spec = StrategySpec(
        id="strat_tmpl_supertrend",
        name="NSE NIFTY Supertrend (10, 3.0) Trend Rider",
        description="ATR-based volatility trend following using standard Supertrend (10, 3.0) parameters.",
        category=StrategyCategory.TREND_FOLLOWING,
        exchange=Exchange.NSE,
        symbol="NIFTY50",
        timeframe=Timeframe.M15,
        entry_timeframe=Timeframe.M15,
        exit_timeframe=Timeframe.M15,
        trading_mode=TradingMode.INTRADAY,
        direction=StrategyDirection.LONG,
        trading_session="09:15-15:30 IST",
        indicators=[st],
        entry_rules=entry_rules,
        exit_rules=ExitRulesSpec(
            stop_loss_method=StopLossMethod.FIXED_POINTS,
            stop_loss_points=40.0,
            profit_target_method=ProfitTargetMethod.FIXED_POINTS,
            target_profit_points=80.0,
            trailing_stop_enabled=False,
            intraday_auto_squareoff="15:15",
            exit_on_opposite_signal=True,
        ),
        position_sizing=_build_standard_position_sizing(50),
        risk_limits=_build_standard_risk_limits(),
        execution_settings=AdvancedExecutionSpec(),
        lifecycle_state=StrategyLifecycleState.DRAFT,
    )

    return StrategyTemplate(
        template_id="tmpl_supertrend",
        name="Supertrend (10, 3.0) Volatility Trend Rider",
        description="Identifies sustained directional momentum based on Average True Range volatility bands.",
        category=StrategyCategory.TREND_FOLLOWING,
        supported_instruments=["NIFTY50", "BANKNIFTY", "CRUDEOIL", "GOLD"],
        supported_timeframes=["5m", "15m", "30m"],
        trading_mode=TradingMode.INTRADAY,
        tags=["Supertrend", "ATR", "Trend Following", "Volatility"],
        entry_logic_summary="LONG when 15m close crosses above Supertrend(10, 3.0).",
        exit_logic_summary="40-pt SL, 80-pt target (1:2 R/R), exit on Supertrend bearish flip.",
        risk_settings_summary="Max 1 open position, ₹5,000 daily loss limit.",
        required_data="NSE/MCX 15m candlestick data feed.",
        known_limitations="Lagging indicator in choppy or rotational market conditions.",
        spec=spec,
    )


# ----------------------------------------------------------------------------------
# TEMPLATE 6: Momentum: RSI (14) Momentum Breakout
# ----------------------------------------------------------------------------------
def get_rsi_momentum_template() -> StrategyTemplate:
    rsi = IndicatorSpec(id="ind_rsi14", type=IndicatorType.RSI, period=14, source="close")

    entry_rules = ConditionGroup(
        id="grp_rsi_entry",
        logic="AND",
        conditions=[
            ConditionRule(
                id="c_rsi_1",
                left=ConditionOperand(type="indicator", indicator_id=rsi.id, indicator_type=IndicatorType.RSI, offset=0),
                operator=ConditionOperator.CROSSES_ABOVE_LEVEL,
                right=ConditionOperand(type="constant", constant_value=60.0),
                description="RSI(14) crosses above bullish momentum threshold (60.0)",
            )
        ],
    )

    spec = StrategySpec(
        id="strat_tmpl_rsi_momentum",
        name="NSE NIFTY RSI(14) Bullish Momentum Breakout",
        description="Captures acceleration in momentum when RSI crosses above the 60 threshold into strong bull territory.",
        category=StrategyCategory.MOMENTUM,
        exchange=Exchange.NSE,
        symbol="NIFTY50",
        timeframe=Timeframe.M5,
        entry_timeframe=Timeframe.M5,
        exit_timeframe=Timeframe.M5,
        trading_mode=TradingMode.INTRADAY,
        direction=StrategyDirection.LONG,
        trading_session="09:15-15:30 IST",
        indicators=[rsi],
        entry_rules=entry_rules,
        exit_rules=ExitRulesSpec(
            stop_loss_method=StopLossMethod.FIXED_POINTS,
            stop_loss_points=25.0,
            profit_target_method=ProfitTargetMethod.FIXED_POINTS,
            target_profit_points=50.0,
            trailing_stop_enabled=False,
            intraday_auto_squareoff="15:15",
            exit_on_opposite_signal=False,
        ),
        position_sizing=_build_standard_position_sizing(50),
        risk_limits=_build_standard_risk_limits(),
        execution_settings=AdvancedExecutionSpec(),
        lifecycle_state=StrategyLifecycleState.DRAFT,
    )

    return StrategyTemplate(
        template_id="tmpl_rsi_momentum",
        name="RSI (14) Bullish Momentum Breakout",
        description="Trades directional surges when Relative Strength Index breaks above the 60 bull threshold.",
        category=StrategyCategory.MOMENTUM,
        supported_instruments=["NIFTY50", "BANKNIFTY", "RELIANCE", "TATAMOTORS"],
        supported_timeframes=["3m", "5m", "15m"],
        trading_mode=TradingMode.INTRADAY,
        tags=["RSI", "Momentum", "Breakout", "5m"],
        entry_logic_summary="LONG when 5m RSI(14) crosses above 60.0.",
        exit_logic_summary="25-pt SL, 50-pt target, 15:15 IST auto square-off.",
        risk_settings_summary="Max 1 open position, 2 entries daily limit.",
        required_data="NSE 5m OHLCV bars.",
        known_limitations="Requires active volume and directional follow-through to prevent fake breakouts.",
        spec=spec,
    )


# ----------------------------------------------------------------------------------
# TEMPLATE 7: Mean Reversion: Bollinger Bands (20, 2.0) Reversion
# ----------------------------------------------------------------------------------
def get_bollinger_bands_template() -> StrategyTemplate:
    bb = IndicatorSpec(id="ind_bb20_2", type=IndicatorType.BOLLINGER_BANDS, period=20, multiplier=2.0, source="close")

    entry_rules = ConditionGroup(
        id="grp_bb_entry",
        logic="AND",
        conditions=[
            ConditionRule(
                id="c_bb_1",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1),
                operator=ConditionOperator.LESS_THAN_OR_EQUAL,
                right=ConditionOperand(type="indicator", indicator_id=bb.id, indicator_type=IndicatorType.BOLLINGER_BANDS),
                description="Previous candle close touches or penetrates lower Bollinger Band",
            ),
            ConditionRule(
                id="c_bb_2",
                left=ConditionOperand(type="price_field", price_field="close", offset=0),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="price_field", price_field="open", offset=0),
                description="Current candle closes bullish green",
            ),
        ],
    )

    spec = StrategySpec(
        id="strat_tmpl_bb_reversion",
        name="NSE NIFTY Bollinger Bands (20, 2.0) Mean Reversion",
        description="Identifies statistical mean-reversion bounces when price reaches 2 standard deviations below the 20-period moving average.",
        category=StrategyCategory.MEAN_REVERSION,
        exchange=Exchange.NSE,
        symbol="NIFTY50",
        timeframe=Timeframe.M15,
        entry_timeframe=Timeframe.M15,
        exit_timeframe=Timeframe.M15,
        trading_mode=TradingMode.INTRADAY,
        direction=StrategyDirection.LONG,
        trading_session="09:15-15:30 IST",
        indicators=[bb],
        entry_rules=entry_rules,
        exit_rules=ExitRulesSpec(
            stop_loss_method=StopLossMethod.FIXED_POINTS,
            stop_loss_points=30.0,
            profit_target_method=ProfitTargetMethod.FIXED_POINTS,
            target_profit_points=45.0,
            trailing_stop_enabled=False,
            intraday_auto_squareoff="15:15",
            exit_on_opposite_signal=False,
        ),
        position_sizing=_build_standard_position_sizing(50),
        risk_limits=_build_standard_risk_limits(),
        execution_settings=AdvancedExecutionSpec(),
        lifecycle_state=StrategyLifecycleState.DRAFT,
    )

    return StrategyTemplate(
        template_id="tmpl_bb_reversion",
        name="Bollinger Bands (20, 2.0) Mean Reversion",
        description="Exploits statistical extremes at 2.0-sigma band bounds with confirmation reversal candle.",
        category=StrategyCategory.MEAN_REVERSION,
        supported_instruments=["NIFTY50", "BANKNIFTY", "RELIANCE", "SBIN"],
        supported_timeframes=["5m", "15m"],
        trading_mode=TradingMode.INTRADAY,
        tags=["Bollinger Bands", "Mean Reversion", "Volatility", "Statistical"],
        entry_logic_summary="LONG when previous candle <= lower band AND current candle is bullish green.",
        exit_logic_summary="30-pt SL, 45-pt target, 15:15 IST auto square-off.",
        risk_settings_summary="Strict 1 position max, ₹5,000 loss limit.",
        required_data="NSE 15m OHLCV bars with 50+ warm-up candles.",
        known_limitations="Can take consecutive stop-losses during strong runaway trend days.",
        spec=spec,
    )


# ----------------------------------------------------------------------------------
# TEMPLATE 8: BTST Momentum Delivery Carrier
# ----------------------------------------------------------------------------------
def get_btst_momentum_template() -> StrategyTemplate:
    fast_ema = IndicatorSpec(id="ind_ema20", type=IndicatorType.EMA, period=20, source="close")

    entry_rules = ConditionGroup(
        id="grp_btst_entry",
        logic="AND",
        conditions=[
            ConditionRule(
                id="c_btst_1",
                left=ConditionOperand(type="price_field", price_field="close", offset=-1),
                operator=ConditionOperator.GREATER_THAN,
                right=ConditionOperand(type="indicator", indicator_id=fast_ema.id, indicator_type=IndicatorType.EMA),
                description="Close above 20 EMA in late afternoon session",
            )
        ],
    )

    spec = StrategySpec(
        id="strat_tmpl_btst_momentum",
        name="NSE Reliance BTST Delivery Momentum Carrier",
        description="Buy Today Sell Tomorrow strategy entering high-probability delivery momentum trades between 15:00-15:25 IST and exiting during next session market open (09:15-09:30 IST).",
        category=StrategyCategory.MOMENTUM,
        exchange=Exchange.NSE,
        symbol="RELIANCE",
        timeframe=Timeframe.M15,
        entry_timeframe=Timeframe.M15,
        exit_timeframe=Timeframe.M15,
        trading_mode=TradingMode.BTST,
        direction=StrategyDirection.LONG,
        trading_session="09:15-15:30 IST",
        btst_settings=BTSTSettingsSpec(
            enabled=True,
            entry_window_start="15:00",
            entry_window_end="15:25",
            next_session_exit_start="09:15",
            next_session_exit_cutoff="09:30",
            gap_risk_acknowledged=True,
            squareoff_on_gap_breach=True,
        ),
        indicators=[fast_ema],
        entry_rules=entry_rules,
        exit_rules=ExitRulesSpec(
            stop_loss_method=StopLossMethod.PERCENTAGE,
            stop_loss_pct=1.5,
            profit_target_method=ProfitTargetMethod.PERCENTAGE,
            target_profit_pct=2.0,
            trailing_stop_enabled=False,
            intraday_auto_squareoff="15:25",
            exit_on_opposite_signal=False,
        ),
        position_sizing=PositionSizingSpec(
            method=PositionSizingMethod.FIXED_QUANTITY,
            value=25,
            max_risk_per_trade_pct=1.5,
            allocation_capital_inr=75000.0,
        ),
        risk_limits=RiskLimitsSpec(
            max_capital_allocation_inr=150000.0,
            max_open_positions=1,
            daily_loss_limit_inr=5000.0,
            max_order_quantity=500,
            allowed_trading_days=["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"],
            prevent_duplicate_entries=True,
        ),
        execution_settings=AdvancedExecutionSpec(),
        lifecycle_state=StrategyLifecycleState.DRAFT,
    )

    return StrategyTemplate(
        template_id="tmpl_btst_momentum",
        name="BTST Delivery Momentum Carrier",
        description="Captures overnight gap-up momentum by taking delivery positions between 15:00-15:25 IST and squaring off at next-day open.",
        category=StrategyCategory.MOMENTUM,
        supported_instruments=["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"],
        supported_timeframes=["15m", "30m"],
        trading_mode=TradingMode.BTST,
        tags=["BTST", "Overnight", "Delivery", "Gap Momentum"],
        entry_logic_summary="LONG between 15:00-15:25 IST when 15m candle close > 20 EMA with bullish close.",
        exit_logic_summary="Next trading day 09:15-09:30 IST market opening auction or 1.5% SL / 2.0% Target.",
        risk_settings_summary="Strict overnight delivery margin check, gap-risk acknowledged, Friday overnight carry disabled.",
        required_data="NSE cash equity daily and intraday feed.",
        known_limitations="Overnight holding carries overnight gap risk that cannot be mitigated while market is closed.",
        spec=spec,
    )


# Master Template Registry
TEMPLATE_REGISTRY: dict[str, StrategyTemplate] = {
    "tmpl_orb_basic": get_basic_orb_template(),
    "tmpl_orb_multigroup": get_multigroup_orb_template(),
    "tmpl_orb_trend_filter": get_orb_trend_filter_template(),
    "tmpl_ema_crossover": get_ema_crossover_template(),
    "tmpl_supertrend": get_supertrend_template(),
    "tmpl_rsi_momentum": get_rsi_momentum_template(),
    "tmpl_bb_reversion": get_bollinger_bands_template(),
    "tmpl_btst_momentum": get_btst_momentum_template(),
}


def list_templates(category: StrategyCategory | None = None, instrument: str | None = None) -> list[StrategyTemplate]:
    """Return all matching strategy templates."""
    results = list(TEMPLATE_REGISTRY.values())
    if category:
        results = [t for t in results if t.category == category]
    if instrument:
        inst_upper = instrument.upper()
        results = [t for t in results if any(inst_upper in sup.upper() for sup in t.supported_instruments)]
    return results


def get_template(template_id: str) -> StrategyTemplate | None:
    """Retrieve a single strategy template by unique ID."""
    return TEMPLATE_REGISTRY.get(template_id)
