"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  api,
  ChatMessage,
  ClarificationQuestion,
  SaveStrategyResponse,
  StrategySpec,
  ValidationReport,
  WorkspaceItem,
} from "../../lib/api";
import { ConversationPanel } from "./ConversationPanel";
import { RuleBuilderPanel } from "./RuleBuilderPanel";
import { ValidationPanel } from "./ValidationPanel";
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FlaskConical,
  PlayCircle,
  Save,
  MessageSquare,
  FileCode,
  Shield,
  Layers,
  Check,
  AlertCircle,
  GitFork,
} from "lucide-react";

interface AiStrategyStudioProps {
  workspace: WorkspaceItem | null;
  onNavigateTab: (tabId: string) => void;
  sharedSpec?: StrategySpec;
  onSpecChange?: (spec: StrategySpec) => void;
  savedStrategyId?: string | null;
  onSavedStrategyIdChange?: (id: string | null) => void;
}

const DEFAULT_STRATEGY_SPEC: StrategySpec = {
  id: "strat_init_alpha",
  name: "NSE NIFTY50 Dual EMA & RSI Filter",
  description: "AI-generated intraday momentum strategy with pre-trade risk controls and statutory 15:15 IST auto square-off.",
  category: "MOMENTUM",
  exchange: "NSE",
  symbol: "NIFTY50",
  timeframe: "15m",
  entry_timeframe: "5m",
  exit_timeframe: "1m",
  trading_mode: "INTRADAY",
  direction: "BOTH",
  trading_session: "09:15-15:30 IST",
  orb_settings: {
    enabled: false,
    range_start_time: "09:15",
    range_end_time: "09:30",
    entry_start_time: "09:30",
    entry_cutoff_time: "14:45",
    calculation_timeframe: "5m",
    confirmation_method: "CANDLE_CLOSE",
    breakout_buffer_pct: 0.1,
    one_entry_per_breakout: true,
    max_entries_per_session: 2,
    range_basis: "HIGH_LOW",
    allow_opposite_side_reentry: false,
  },
  btst_settings: {
    enabled: false,
    entry_window_start: "15:00",
    entry_window_end: "15:25",
    next_session_exit_start: "09:15",
    next_session_exit_cutoff: "09:30",
    gap_risk_acknowledged: false,
    squareoff_on_gap_breach: true,
  },
  tsl_settings: {
    enabled: false,
    activation_type: "POINTS",
    activation_value: 20.0,
    distance_type: "POINTS",
    distance_value: 10.0,
    step_value: 5.0,
    atr_multiplier: 1.5,
    update_timeframe: "1m",
    evaluation_candle_offset: -1,
    lock_profit_at_activation: true,
  },
  indicators: [
    { id: "ind_ema9", type: "EMA", period: 9, source: "close" },
    { id: "ind_ema21", type: "EMA", period: 21, source: "close" },
    { id: "ind_rsi14", type: "RSI", period: 14, source: "close" },
  ],
  entry_rules: {
    id: "grp_root",
    logic: "AND",
    conditions: [
      {
        id: "cond_ema_cross",
        left: { type: "indicator", indicator_type: "EMA", offset: 0, timeframe: "15m" },
        operator: "CROSSES_ABOVE",
        right: { type: "indicator", indicator_type: "EMA", offset: 0, timeframe: "15m" },
        description: "EMA(9) crosses above EMA(21) on NIFTY50 15m",
      },
      {
        id: "cond_rsi_filter",
        left: { type: "indicator", indicator_type: "RSI", offset: 0, timeframe: "15m" },
        operator: "GREATER_THAN",
        right: { type: "constant", constant_value: 50.0, offset: 0 },
        description: "RSI(14) > 50 confirming momentum expansion",
      },
    ],
  },
  call_entry_rules: {
    id: "grp_call_entry_root",
    logic: "OR",
    conditions: [],
    nested_groups: [
      {
        id: "grp_call_a",
        logic: "AND",
        conditions: [
          {
            id: "rule_call_a1",
            left: { type: "price_field", price_field: "close", offset: -2, timeframe: "5m" },
            operator: "LESS_THAN",
            right: { type: "price_field", price_field: "orb_high", offset: 0 },
            description: "Candle -2 Close < ORB High",
          },
          {
            id: "rule_call_a2",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "5m" },
            operator: "GREATER_THAN",
            right: { type: "price_field", price_field: "orb_high", offset: 0 },
            description: "Candle -1 Close > ORB High",
          },
        ],
        nested_groups: [],
      },
      {
        id: "grp_call_b",
        logic: "AND",
        conditions: [
          {
            id: "rule_call_b1",
            left: { type: "price_field", price_field: "close", offset: -2, timeframe: "5m" },
            operator: "LESS_THAN",
            right: { type: "price_field", price_field: "orb_low", offset: 0 },
            description: "Candle -2 Close < ORB Low",
          },
          {
            id: "rule_call_b2",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "5m" },
            operator: "GREATER_THAN",
            right: { type: "price_field", price_field: "orb_low", offset: 0 },
            description: "Candle -1 Close > ORB Low",
          },
        ],
        nested_groups: [],
      },
    ],
  },
  put_entry_rules: {
    id: "grp_put_entry_root",
    logic: "OR",
    conditions: [],
    nested_groups: [
      {
        id: "grp_put_a",
        logic: "AND",
        conditions: [
          {
            id: "rule_put_a1",
            left: { type: "price_field", price_field: "close", offset: -2, timeframe: "5m" },
            operator: "GREATER_THAN",
            right: { type: "price_field", price_field: "orb_low", offset: 0 },
            description: "Candle -2 Close > ORB Low",
          },
          {
            id: "rule_put_a2",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "5m" },
            operator: "LESS_THAN",
            right: { type: "price_field", price_field: "orb_low", offset: 0 },
            description: "Candle -1 Close < ORB Low",
          },
        ],
        nested_groups: [],
      },
      {
        id: "grp_put_b",
        logic: "AND",
        conditions: [
          {
            id: "rule_put_b1",
            left: { type: "price_field", price_field: "close", offset: -2, timeframe: "5m" },
            operator: "GREATER_THAN",
            right: { type: "price_field", price_field: "orb_high", offset: 0 },
            description: "Candle -2 Close > ORB High",
          },
          {
            id: "rule_put_b2",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "5m" },
            operator: "LESS_THAN",
            right: { type: "price_field", price_field: "orb_high", offset: 0 },
            description: "Candle -1 Close < ORB High",
          },
        ],
        nested_groups: [],
      },
    ],
  },
  call_exit_rules: {
    id: "grp_call_exit_root",
    logic: "OR",
    conditions: [],
    nested_groups: [
      {
        id: "grp_call_exit_a",
        logic: "AND",
        conditions: [
          {
            id: "rule_call_exit_1",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "1m" },
            operator: "LESS_THAN",
            right: { type: "price_field", price_field: "orb_midpoint", offset: 0 },
            description: "Candle -1 Close < ORB Midpoint",
          },
        ],
        nested_groups: [],
      },
    ],
  },
  put_exit_rules: {
    id: "grp_put_exit_root",
    logic: "OR",
    conditions: [],
    nested_groups: [
      {
        id: "grp_put_exit_a",
        logic: "AND",
        conditions: [
          {
            id: "rule_put_exit_1",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "1m" },
            operator: "GREATER_THAN",
            right: { type: "price_field", price_field: "orb_midpoint", offset: 0 },
            description: "Candle -1 Close > ORB Midpoint",
          },
        ],
        nested_groups: [],
      },
    ],
  },
  exit_rules: {
    stop_loss_pct: 0.65,
    target_profit_pct: 1.5,
    trailing_stop_enabled: true,
    trailing_stop_trigger_pct: 1.0,
    trailing_stop_step_pct: 0.25,
    intraday_auto_squareoff: "15:15 IST",
    exit_on_opposite_signal: true,
  },
  position_sizing: {
    method: "FIXED_CAPITAL",
    value: 100000.0,
    max_risk_per_trade_pct: 1.0,
    allocation_capital_inr: 500000.0,
  },
  risk_limits: {
    max_capital_allocation_inr: 500000.0,
    max_open_positions: 3,
    daily_loss_limit_inr: 15000.0,
    max_order_quantity: 1800,
    allowed_trading_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    prevent_duplicate_entries: true,
    entry_cooldown_bars: 3,
  },
  execution_settings: {
    slippage_pct: 0.05,
    include_stt_ctt: true,
    include_exchange_turnover_charges: true,
    include_gst: true,
    brokerage_per_order_inr: 20.0,
  },
  lifecycle_state: "VALIDATED",
};

const WELCOME_CHAT_MESSAGE: ChatMessage = {
  id: "msg_welcome",
  role: "assistant",
  content:
    "Welcome to the **TradingWave AI Strategy Studio**.\n\n" +
    "Describe your trading concept in plain English or refine the institutional template loaded in the center panel. " +
    "I will detect technical parameters, point out ambiguous or missing risk rules, and compile deterministic specifications ready for backtesting on licensed Indian historical data.",
  timestamp: new Date().toISOString(),
  clarification_questions: [
    {
      id: "clarify_init_sl",
      category: "Risk Control",
      question: "Would you like to enforce an intraday trailing stop or hard percentage stop?",
      explanation: "Setting clear stop loss bounds prevents unquantified downside risk during volatile opening candles.",
      options: ["0.65% Hard Stop Loss", "1.0% Hard Stop Loss", "1.5× ATR Trailing Stop"],
      suggested_default: "0.65% Hard Stop Loss",
    },
  ],
};

export function AiStrategyStudio({
  workspace,
  onNavigateTab,
  sharedSpec,
  onSpecChange,
  savedStrategyId: savedStrategyIdProp,
  onSavedStrategyIdChange,
}: AiStrategyStudioProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_CHAT_MESSAGE]);
  const [spec, setSpec] = useState<StrategySpec>(sharedSpec || DEFAULT_STRATEGY_SPEC);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [howItWorks, setHowItWorks] = useState<string[]>([
    "1. Monitors NIFTY50 on NSE using 15m candlestick bars during 09:15-15:30 IST.",
    "2. Evaluates entry condition on candle close: EMA(9) crosses above EMA(21) and RSI(14) > 50.",
    "3. Enforces fixed capital allocation of ₹100,000 per signal.",
    "4. Attaches hard stop loss at 0.65% and profit target at 1.50%.",
    "5. Automatically squares off positions at 15:15 IST and enforces ₹15,000 daily loss circuit.",
  ]);
  const [failureModes, setFailureModes] = useState<string[]>([
    "Whipsaws in Choppy / Sideways Regimes: When price oscillates without momentum, moving average crossovers trigger consecutive stop losses.",
    "Overnight Gap Risk: Intraday square-off at 15:15 IST protects against morning opening gap-downs.",
    "Slippage in High-Volatility Events: Sudden news spikes may incur execution slippage higher than the 0.05% model.",
  ]);
  const [aiProviderName, setAiProviderName] = useState("TradingWave Deterministic Engine (Local)");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [savedStrategyId, setSavedStrategyId] = useState<string | null>(savedStrategyIdProp || null);
  const [lastSavedVersion, setLastSavedVersion] = useState<SaveStrategyResponse | null>(null);

  useEffect(() => {
    if (sharedSpec && sharedSpec !== spec) {
      setSpec(sharedSpec);
    }
  }, [sharedSpec]);

  const [loadingChat, setLoadingChat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backtesting, setBacktesting] = useState(false);
  const [paperStarting, setPaperStarting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Mobile/Tablet Tab selection
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "builder" | "validation">("chat");

  // Run initial validation on mount
  useEffect(() => {
    if (!workspace) return;
    api
      .validateStrategy(workspace.id, spec)
      .then((rep) => setValidation(rep))
      .catch((err) => console.error("Initial validation error:", err));
  }, [workspace?.id]);

  // Debounced validation on spec change
  const triggerValidation = useCallback(
    (updatedSpec: StrategySpec) => {
      if (!workspace) return;
      api
        .validateStrategy(workspace.id, updatedSpec)
        .then((rep) => setValidation(rep))
        .catch((err) => console.error("Validation error:", err));
    },
    [workspace?.id]
  );

  function handleSpecChange(updatedSpec: StrategySpec) {
    setSpec(updatedSpec);
    if (onSpecChange) {
      onSpecChange(updatedSpec);
    }
    triggerValidation(updatedSpec);
  }

  // Handle chat submission
  async function handleSendMessage(promptText: string) {
    if (!workspace) {
      setNotification({ type: "error", text: "Please sign in or select an active workspace." });
      return;
    }

    setLoadingChat(true);
    setNotification(null);

    // Optimistically push user message
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: promptText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const resp = await api.aiStudioChat(workspace.id, {
        prompt: promptText,
        conversation_id: conversationId || undefined,
        current_spec: spec,
      });

      setConversationId(resp.conversation_id);
      setMessages((prev) => [...prev, resp.message]);
      setSpec(resp.spec);
      if (onSpecChange) {
        onSpecChange(resp.spec);
      }
      setValidation(resp.validation);
      setHowItWorks(resp.how_it_works);
      setFailureModes(resp.failure_modes);
      setAiProviderName(resp.ai_provider);
    } catch (err: any) {
      console.error("AI Studio chat failed:", err);
      setNotification({
        type: "error",
        text: err.message || "Failed to process strategy prompt. Please retry.",
      });
    } finally {
      setLoadingChat(false);
    }
  }

  function handleApplyClarification(question: ClarificationQuestion, selectedOption: string) {
    const prompt = `Apply ${question.category} rule clarification: ${selectedOption}`;
    handleSendMessage(prompt);
  }

  function handleResetConversation() {
    if (confirm("Reset conversation and restore default institutional template?")) {
      setMessages([WELCOME_CHAT_MESSAGE]);
      setSpec(DEFAULT_STRATEGY_SPEC);
      if (onSpecChange) onSpecChange(DEFAULT_STRATEGY_SPEC);
      setConversationId(null);
      setSavedStrategyId(null);
      if (onSavedStrategyIdChange) onSavedStrategyIdChange(null);
      setLastSavedVersion(null);
      triggerValidation(DEFAULT_STRATEGY_SPEC);
    }
  }

  // Save Strategy to Database
  async function handleSaveStrategy() {
    if (!workspace) return;
    setSaving(true);
    setNotification(null);

    try {
      const resp = await api.saveStrategy(workspace.id, {
        spec,
        strategy_id: savedStrategyId || undefined,
      });

      setSavedStrategyId(resp.strategy_id);
      if (onSavedStrategyIdChange) {
        onSavedStrategyIdChange(resp.strategy_id);
      }
      setLastSavedVersion(resp);
      setNotification({
        type: "success",
        text: `Strategy '${resp.name}' successfully saved as Version #${resp.version_number}.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error("Failed to save strategy:", err);
      setNotification({
        type: "error",
        text: err.message || "Failed to save strategy specification.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Submit to Backtest
  async function handleTriggerBacktest() {
    if (!workspace) return;
    setBacktesting(true);
    setNotification(null);

    try {
      // Save strategy first if not saved
      let stratId = savedStrategyId;
      let verId = lastSavedVersion?.version_id;

      if (!stratId) {
        const saveResp = await api.saveStrategy(workspace.id, { spec });
        stratId = saveResp.strategy_id;
        verId = saveResp.version_id;
        setSavedStrategyId(stratId);
        setLastSavedVersion(saveResp);
      }

      const btResp = await api.triggerBacktest(workspace.id, {
        strategy_id: stratId,
        version_id: verId,
      });

      setNotification({
        type: "success",
        text: `${btResp.message} Job ID: ${btResp.job_id.slice(0, 8)}...`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      console.error("Failed to trigger backtest:", err);
      setNotification({
        type: "error",
        text: err.message || "Cannot trigger backtest: strategy has blocking errors.",
      });
    } finally {
      setBacktesting(false);
    }
  }

  // Launch Paper Trading
  async function handleTriggerPaperSession() {
    if (!workspace) return;
    setPaperStarting(true);
    setNotification(null);

    try {
      let stratId = savedStrategyId;
      let verId = lastSavedVersion?.version_id;

      if (!stratId) {
        const saveResp = await api.saveStrategy(workspace.id, { spec });
        stratId = saveResp.strategy_id;
        verId = saveResp.version_id;
        setSavedStrategyId(stratId);
        setLastSavedVersion(saveResp);
      }

      const paperResp = await api.triggerPaperSession(workspace.id, {
        strategy_id: stratId,
        version_id: verId,
      });

      setNotification({
        type: "success",
        text: `${paperResp.message} (${paperResp.disclaimer})`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      console.error("Failed to launch paper session:", err);
      setNotification({
        type: "error",
        text: err.message || "Failed to launch paper trading simulation.",
      });
    } finally {
      setPaperStarting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)] p-4 sm:p-6 space-y-4">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text)] tracking-tight">
              AI Strategy Studio
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30">
              Deterministic AST
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Describe your trading idea in plain English. Refine rules with targeted AI clarification. Validate before backtesting.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigateTab("visual_builder")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF7722]/10 hover:bg-[#FF7722]/20 border border-[#FF7722]/30 text-xs font-bold text-[#FF7722] shadow-sm transition-all"
            title="Open in Visual Strategy Node Builder"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Open in Visual Builder</span>
          </button>

          <button
            type="button"
            onClick={handleSaveStrategy}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)]/40 border border-[var(--border)] text-xs font-bold text-[var(--text)] shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-[#FF7722]" />
            )}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerBacktest}
            disabled={!validation?.can_backtest || backtesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {backtesting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FlaskConical className="w-3.5 h-3.5" />
            )}
            <span>Backtest Lab</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerPaperSession}
            disabled={!validation?.can_backtest || paperStarting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--profit)]/15 hover:bg-[var(--profit)]/25 text-[var(--profit)] border border-[var(--profit)]/30 text-xs font-bold transition-all disabled:opacity-50"
          >
            {paperStarting ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <PlayCircle className="w-3.5 h-3.5" />
            )}
            <span>Paper Trade</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-500"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {notification.type === "success" ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile/Tablet Tab Switcher (hidden on desktop xl screens) */}
      <div className="flex xl:hidden rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)] text-xs">
        <button
          onClick={() => setActiveMobileTab("chat")}
          className={`flex-1 py-1.5 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeMobileTab === "chat" ? "bg-[#FF7722] text-white shadow-sm" : "text-[var(--text-muted)]"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>AI Chat</span>
        </button>
        <button
          onClick={() => setActiveMobileTab("builder")}
          className={`flex-1 py-1.5 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeMobileTab === "builder" ? "bg-[#FF7722] text-white shadow-sm" : "text-[var(--text-muted)]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Rule Builder</span>
        </button>
        <button
          onClick={() => setActiveMobileTab("validation")}
          className={`flex-1 py-1.5 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeMobileTab === "validation" ? "bg-[#FF7722] text-white shadow-sm" : "text-[var(--text-muted)]"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Validation & Risk</span>
        </button>
      </div>

      {/* Main Studio Grid: 3-Panel Layout on Desktop */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* PANEL 1: AI Chat & Clarification (Desktop 4 cols) */}
        <div
          className={`h-full min-h-[500px] xl:col-span-4 ${
            activeMobileTab === "chat" ? "block" : "hidden xl:block"
          }`}
        >
          <ConversationPanel
            messages={messages}
            loading={loadingChat}
            onSendMessage={handleSendMessage}
            onApplyClarification={handleApplyClarification}
            onResetConversation={handleResetConversation}
            aiProviderName={aiProviderName}
          />
        </div>

        {/* PANEL 2: Rule Builder & Specification (Desktop 5 cols) */}
        <div
          className={`h-full min-h-[500px] xl:col-span-5 ${
            activeMobileTab === "builder" ? "block" : "hidden xl:block"
          }`}
        >
          <RuleBuilderPanel spec={spec} onChangeSpec={handleSpecChange} />
        </div>

        {/* PANEL 3: Pre-flight Validation & Explainability (Desktop 3 cols) */}
        <div
          className={`h-full min-h-[500px] xl:col-span-3 ${
            activeMobileTab === "validation" ? "block" : "hidden xl:block"
          }`}
        >
          <ValidationPanel
            spec={spec}
            validation={validation}
            howItWorks={howItWorks}
            failureModes={failureModes}
            saving={saving}
            backtesting={backtesting}
            paperStarting={paperStarting}
            onSaveStrategy={handleSaveStrategy}
            onTriggerBacktest={handleTriggerBacktest}
            onTriggerPaperSession={handleTriggerPaperSession}
            lastSavedVersion={lastSavedVersion}
          />
        </div>
      </div>
    </div>
  );
}
