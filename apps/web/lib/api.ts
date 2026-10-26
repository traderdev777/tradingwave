/**
 * Typed HTTP API client for TradingWave FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  status: string;
  created_at: string;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  plan_code: string;
  role: string;
  created_at: string;
}

export interface StrategySummaryItem {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  current_version_number?: number;
  specification_hash?: string | null;
  instrument?: string;
  timeframe?: string;
  operating_mode?: string;
  last_signal_time?: string | null;
  last_error?: string | null;
  updated_at: string;
}

export interface BacktestSummaryItem {
  id: string;
  strategy_name: string;
  instrument?: string;
  timeframe?: string;
  test_period?: string;
  status: string;
  cagr_percent: number;
  max_drawdown_percent: number;
  sharpe_ratio: number;
  trades_count: number;
  win_rate_percent?: number;
  created_at: string;
}

export interface PaperSessionSummaryItem {
  id: string;
  strategy_name: string;
  instrument?: string;
  status: string;
  net_pnl_inr: number;
  pnl_percentage: number;
  open_positions: number;
  open_positions_detail?: string;
  orders_count?: number;
  last_event?: string;
  execution_latency_ms: number;
  created_at: string;
}

export interface AlertItem {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  resource: string;
  timestamp: string;
  resolved: boolean;
}

export interface SystemHealthItem {
  historical_data_status: string;
  data_timestamp: string;
  background_workers_active: number;
  api_status: string;
  redis_cache_status: string;
  db_latency_ms: number;
}

export interface EquityPoint {
  time: string;
  value: number;
  pnl: number;
}

export interface AIDraftResponse {
  strategy_name: string;
  description: string;
  market: string;
  symbol: string;
  timeframe: string;
  indicators: Array<{ type: string; period?: number; multiplier?: number }>;
  entry_rules: string[];
  exit_rules: string[];
  risk_management: {
    stop_loss_pct?: number;
    target_profit_pct?: number;
    auto_squareoff?: string;
  };
  validation_status: string;
  explanation: string;
}

// AI Strategy Studio Typed Models
export type SupportedTimeframe =
  | "1m"
  | "2m"
  | "3m"
  | "5m"
  | "10m"
  | "15m"
  | "16m"
  | "30m"
  | "45m"
  | "1h"
  | "60m"
  | "1d";

export interface IndicatorSpec {
  id: string;
  type: string;
  period: number;
  multiplier?: number;
  source?: string;
  timeframe?: string;
  params?: Record<string, any>;
}

export interface ConditionOperand {
  type: "indicator" | "price_field" | "constant" | "range";
  indicator_id?: string;
  indicator_type?: string;
  price_field?:
    | "open"
    | "high"
    | "low"
    | "close"
    | "volume"
    | "typical_price"
    | "hl2"
    | "hlc3"
    | "orb_high"
    | "orb_low"
    | "orb_midpoint"
    | "prev_candle_high"
    | "prev_candle_low"
    | string;
  constant_value?: number;
  range_min?: number;
  range_max?: number;
  timeframe?: string;
  offset: number;
}

export interface ConditionRule {
  id: string;
  left: ConditionOperand;
  operator: string;
  right: ConditionOperand;
  description?: string;
}

export interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: ConditionRule[];
  nested_groups?: ConditionGroup[];
}

export interface ProfitTargetLeg {
  target_number: number;
  target_pct?: number;
  target_points?: number;
  quantity_allocation_pct: number;
}

export interface ORBSettingsSpec {
  enabled: boolean;
  range_start_time: string;
  range_end_time: string;
  entry_start_time: string;
  entry_cutoff_time: string;
  calculation_timeframe: string;
  first_candle_timeframe?: string;
  confirmation_method: "CANDLE_CLOSE" | "HIGH_LOW_PENETRATION" | "RETEST_CONFIRMATION";
  breakout_buffer_pct: number;
  one_entry_per_breakout: boolean;
  max_entries_per_session: number;
  range_basis: "HIGH_LOW" | "BODY_OPEN_CLOSE";
  allow_opposite_side_reentry: boolean;
}

export interface BTSTSettingsSpec {
  enabled: boolean;
  entry_window_start: string;
  entry_window_end: string;
  next_session_exit_start: string;
  next_session_exit_cutoff: string;
  gap_risk_acknowledged: boolean;
  squareoff_on_gap_breach: boolean;
}

export interface TSLSettingsSpec {
  enabled: boolean;
  activation_type: "POINTS" | "PERCENTAGE" | "R_MULTIPLE";
  activation_value: number;
  distance_type: "POINTS" | "PERCENTAGE" | "ATR_MULTIPLIER" | "CANDLE_HIGH_LOW" | "STEP_BASED" | "INDICATOR_BASED";
  distance_value: number;
  step_value?: number;
  atr_multiplier?: number;
  update_timeframe: string;
  evaluation_candle_offset: number;
  lock_profit_at_activation: boolean;
  custom_exit_condition?: string | null;
}

export interface ExitRulesSpec {
  stop_loss_method?: "FIXED_POINTS" | "PERCENTAGE" | "FIXED_CURRENCY" | "ATR_BASED" | "ORB_BASED" | "PREV_CANDLE_HIGH_LOW" | "INDICATOR_BASED" | "CUSTOM_CONDITION";
  stop_loss_pct?: number;
  stop_loss_points?: number;
  stop_loss_atr_multiplier?: number;
  orb_stop_buffer_pct?: number;

  profit_target_method?: "FIXED_POINTS" | "PERCENTAGE" | "RISK_REWARD_MULTIPLE" | "ORB_RANGE_MULTIPLE" | "INDICATOR_BASED" | "MULTIPLE_TARGETS";
  target_profit_pct?: number;
  target_profit_points?: number;
  target_profit_rr_multiple?: number;
  profit_target_legs?: ProfitTargetLeg[];

  trailing_stop_enabled: boolean;
  trailing_stop_trigger_pct?: number;
  trailing_stop_step_pct?: number;
  trailing_stop_atr_multiplier?: number;

  intraday_auto_squareoff: string;
  exit_on_opposite_signal: boolean;
  time_based_max_holding_bars?: number;
  exit_conditions?: ConditionGroup | null;
}

export interface PositionSizingSpec {
  method: "FIXED_QUANTITY" | "FIXED_CAPITAL" | "PERCENTAGE_OF_CAPITAL" | "RISK_BASED";
  value: number;
  max_risk_per_trade_pct: number;
  allocation_capital_inr: number;
}

export interface RiskLimitsSpec {
  max_capital_allocation_inr: number;
  max_open_positions: number;
  daily_loss_limit_inr: number;
  max_order_quantity: number;
  allowed_trading_days: string[];
  prevent_duplicate_entries: boolean;
  entry_cooldown_bars: number;
}

export interface AdvancedExecutionSpec {
  slippage_pct: number;
  include_stt_ctt: boolean;
  include_exchange_turnover_charges: boolean;
  include_gst: boolean;
  brokerage_per_order_inr: number;
}

export interface StrategySpec {
  id: string;
  name: string;
  description: string;
  category: string;
  exchange: "NSE" | "BSE" | "MCX";
  symbol: string;
  timeframe: string;
  entry_timeframe?: string;
  exit_timeframe?: string;
  trading_mode?: "INTRADAY" | "BTST";
  direction?: "LONG" | "SHORT" | "BOTH";
  trading_session: string;

  orb_settings?: ORBSettingsSpec;
  btst_settings?: BTSTSettingsSpec;
  tsl_settings?: TSLSettingsSpec;

  indicators: IndicatorSpec[];
  entry_rules: ConditionGroup;
  exit_rules: ExitRulesSpec;
  call_entry_rules?: ConditionGroup;
  put_entry_rules?: ConditionGroup;
  call_exit_rules?: ConditionGroup;
  put_exit_rules?: ConditionGroup;
  position_sizing: PositionSizingSpec;
  risk_limits: RiskLimitsSpec;
  execution_settings: AdvancedExecutionSpec;
  lifecycle_state: string;
  compiler_version?: string;
}

export const DEFAULT_ORB_SETTINGS: ORBSettingsSpec = {
  enabled: true,
  range_start_time: "09:15",
  range_end_time: "09:30",
  entry_start_time: "09:30",
  entry_cutoff_time: "14:30",
  calculation_timeframe: "15m",
  first_candle_timeframe: "3m",
  confirmation_method: "CANDLE_CLOSE",
  breakout_buffer_pct: 0.1,
  one_entry_per_breakout: true,
  max_entries_per_session: 2,
  range_basis: "HIGH_LOW",
  allow_opposite_side_reentry: false,
};

export const DEFAULT_TSL_SETTINGS: TSLSettingsSpec = {
  enabled: true,
  activation_type: "POINTS",
  activation_value: 20.0,
  distance_type: "POINTS",
  distance_value: 10.0,
  step_value: 5.0,
  atr_multiplier: 1.5,
  update_timeframe: "1m",
  evaluation_candle_offset: -1,
  lock_profit_at_activation: true,
};

export const DEFAULT_BTST_SETTINGS: BTSTSettingsSpec = {
  enabled: false,
  entry_window_start: "15:00",
  entry_window_end: "15:25",
  next_session_exit_start: "09:15",
  next_session_exit_cutoff: "09:30",
  gap_risk_acknowledged: false,
  squareoff_on_gap_breach: true,
};

export interface ValidationIssue {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  message: string;
  affected_field: string;
  suggested_correction: string;
  blocks_testing: boolean;
}

export interface ValidationReport {
  is_valid: boolean;
  can_backtest: boolean;
  can_paper_trade: boolean;
  error_count: number;
  warning_count: number;
  info_count: number;
  issues: ValidationIssue[];
  explanation: string;
}

export interface ClarificationQuestion {
  id: string;
  category: string;
  question: string;
  explanation: string;
  options: string[];
  suggested_default: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  clarification_questions?: ClarificationQuestion[];
  strategy_spec?: StrategySpec;
  validation_report?: ValidationReport;
}

export interface AIStudioChatResponse {
  conversation_id: string;
  message: ChatMessage;
  spec: StrategySpec;
  validation: ValidationReport;
  how_it_works: string[];
  failure_modes: string[];
  ai_provider: string;
}

export interface SaveStrategyResponse {
  strategy_id: string;
  version_id: string;
  version_number: number;
  name: string;
  specification_hash: string;
  status: string;
  validation: ValidationReport;
}

export interface StrategyVersionItem {
  version_id: string;
  version_number: number;
  specification_hash: string;
  compiler_version: string;
  created_at: string;
  is_current: boolean;
  change_summary?: string;
  validation_report?: any;
}

export interface StrategyDetailResponse {
  id?: string;
  strategy_id: string;
  name: string;
  description: string;
  status: string;
  version_id: string;
  version_number: number;
  specification_hash: string;
  spec: StrategySpec;
  compiler_version: string;
  created_at: string;
  updated_at: string;
}

export interface StrategyLibrarySummary {
  total_strategies: number;
  draft_count: number;
  validated_count: number;
  backtested_count: number;
  paper_count: number;
  favorites_count: number;
  archived_count: number;
}

export interface StrategyLibraryItem {
  id: string;
  name: string;
  description: string;
  status: string;
  is_favorite: boolean;
  folder_id: string | null;
  folder_name?: string | null;
  tags: string[];
  source: string;
  current_version_id: string | null;
  version_number: number;
  specification_hash: string | null;
  spec: {
    symbol: string;
    exchange: string;
    category: string;
    timeframe: string;
    entry_timeframe?: string;
    exit_timeframe?: string;
    trading_mode?: string;
    indicators_count: number;
    has_tsl: boolean;
    has_orb: boolean;
  };
  validation: {
    is_valid: boolean;
    error_count: number;
    warning_count: number;
  };
  last_backtest: {
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    metrics?: {
      net_pnl_inr?: number;
      max_drawdown_pct?: number;
      win_rate_pct?: number;
      trades_count?: number;
      profit_factor?: number;
      test_period_start?: string;
      test_period_end?: string;
    } | null;
  } | null;
  versions_count: number;
  created_at: string;
  updated_at: string;
}

export interface StrategyFolderItem {
  id: string;
  name: string;
  color: string;
  description?: string;
  strategy_count: number;
  created_at: string;
}

export interface StrategyTemplateItem {
  template_id: string;
  name: string;
  description: string;
  category: string;
  supported_instruments: string[];
  supported_timeframes: string[];
  trading_mode: string;
  tags: string[];
  entry_logic_summary: string;
  exit_logic_summary: string;
  risk_settings_summary: string;
  required_data: string;
  known_limitations: string;
  template_version: string;
  backtest_disclaimer: string;
  spec?: StrategySpec;
}

export interface BacktestHistoryItem {
  job_id: string;
  version_number: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  configuration?: any;
  metrics?: {
    net_pnl_inr?: number;
    max_drawdown_pct?: number;
    win_rate_pct?: number;
    trades_count?: number;
    profit_factor?: number;
    test_period_start?: string;
    test_period_end?: string;
  };
  error_message?: string | null;
}

export interface StrategyComparisonData {
  item_1: Record<string, any>;
  item_2: Record<string, any>;
  differences: Record<string, boolean>;
}

export interface DashboardSummary {
  workspace_id: string;
  workspace_name: string;
  plan_code: string;
  saved_strategies_count: number;
  published_versions_count: number;
  recent_backtests_count: number;
  running_paper_sessions_count: number;
  win_rate_percent?: number;
  total_trades_evaluated?: number;
  max_portfolio_drawdown?: number;
  risk_limits: {
    max_open_positions: number;
    max_exposure_inr: number;
    daily_loss_limit_inr: number;
    max_drawdown_percent: number;
  };
  live_broker_connected: boolean;
  live_broker_message: string;
  system_health?: SystemHealthItem;
  alerts?: AlertItem[];
  strategies?: StrategySummaryItem[];
  recent_backtests?: BacktestSummaryItem[];
  paper_sessions?: PaperSessionSummaryItem[];
  equity_series?: Record<string, EquityPoint[]>;
}

export interface SessionData {
  user: UserProfile;
  active_workspace: WorkspaceItem;
  workspaces: WorkspaceItem[];
  token: {
    access_token: string;
    token_type: string;
    expires_in_minutes: number;
  };
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tradingwave_token");
}

export function setStoredToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("tradingwave_token", token);
  }
}

export function clearStoredToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("tradingwave_token");
    localStorage.removeItem("tradingwave_workspace_id");
  }
}

export function getStoredWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tradingwave_workspace_id");
}

export function setStoredWorkspaceId(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("tradingwave_workspace_id", id);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const workspaceId = getStoredWorkspaceId();
  if (workspaceId) {
    headers["X-Workspace-ID"] = workspaceId;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = body?.error?.message || `HTTP error ${response.status}`;
    const err = new Error(errorMsg) as Error & { code?: string; details?: any[] };
    err.code = body?.error?.code;
    err.details = body?.error?.details;
    throw err;
  }

  return body.data as T;
}

export const api = {
  // Auth
  register: (payload: {
    email: string;
    password: string;
    display_name: string;
    workspace_name?: string;
  }) => request<SessionData>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string }) =>
    request<SessionData>("/auth/session", { method: "POST", body: JSON.stringify(payload) }),

  getDemoSession: () => request<SessionData>("/auth/demo-session", { method: "POST" }),

  logout: () => request<{ status: string }>("/auth/session", { method: "DELETE" }),

  // User & Workspaces
  getMe: () => request<{ user: UserProfile; workspaces: WorkspaceItem[] }>("/users/me"),

  getWorkspaces: () => request<WorkspaceItem[]>("/workspaces"),

  getDashboardSummary: (workspaceId: string) =>
    request<DashboardSummary>(`/workspaces/${workspaceId}/dashboard-summary`),

  draftAIStrategy: (workspaceId: string, payload: { prompt: string; market?: string }) =>
    request<AIDraftResponse>(`/workspaces/${workspaceId}/strategies/ai-draft`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  togglePaperSession: (workspaceId: string, sessionId: string) =>
    request<{ session_id: string; status: string }>(
      `/workspaces/${workspaceId}/paper-sessions/${sessionId}/toggle-status`,
      { method: "POST" }
    ),

  // AI Strategy Studio
  aiStudioChat: (
    workspaceId: string,
    payload: { prompt: string; conversation_id?: string; current_spec?: any }
  ) =>
    request<AIStudioChatResponse>(`/workspaces/${workspaceId}/ai-studio/chat`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  validateStrategy: (workspaceId: string, spec: any) =>
    request<ValidationReport>(`/workspaces/${workspaceId}/ai-studio/validate`, {
      method: "POST",
      body: JSON.stringify({ spec }),
    }),

  saveStrategy: (workspaceId: string, payload: { spec: any; strategy_id?: string }) =>
    request<SaveStrategyResponse>(`/workspaces/${workspaceId}/ai-studio/save-strategy`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getWorkspaceStrategies: (workspaceId: string) =>
    request<StrategySummaryItem[]>(`/workspaces/${workspaceId}/ai-studio/strategies`),

  getStrategyDetails: (workspaceId: string, strategyId: string, versionId?: string) => {
    const qs = versionId ? `?version_id=${versionId}` : "";
    return request<StrategyDetailResponse>(`/workspaces/${workspaceId}/ai-studio/strategies/${strategyId}${qs}`);
  },

  getStrategyVersions: (workspaceId: string, strategyId: string) =>
    request<StrategyVersionItem[]>(`/workspaces/${workspaceId}/ai-studio/strategies/${strategyId}/versions`),

  duplicateStrategy: (workspaceId: string, strategyId: string) =>
    request<{
      strategy_id: string;
      version_id: string;
      version_number: number;
      name: string;
      status: string;
      spec: StrategySpec;
    }>(`/workspaces/${workspaceId}/ai-studio/strategies/${strategyId}/duplicate`, {
      method: "POST",
    }),

  getAIStudioConversations: (workspaceId: string) =>
    request<Array<{ id: string; title: string; messages_count: number; created_at: string; updated_at: string }>>(
      `/workspaces/${workspaceId}/ai-studio/conversations`
    ),

  triggerBacktest: (workspaceId: string, payload: { strategy_id: string; version_id?: string }) =>
    request<{ job_id: string; strategy_id: string; version_number: number; status: string; message: string }>(
      `/workspaces/${workspaceId}/ai-studio/backtest`,
      { method: "POST", body: JSON.stringify(payload) }
    ),

  triggerPaperSession: (workspaceId: string, payload: { strategy_id: string; version_id?: string }) =>
    request<{ session_id: string; strategy_id: string; status: string; message: string; disclaimer: string }>(
      `/workspaces/${workspaceId}/ai-studio/paper-session`,
      { method: "POST", body: JSON.stringify(payload) }
    ),

  // Strategy Library
  getLibraryStrategies: (workspaceId: string, params: Record<string, any> = {}) => {
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        qp.append(k, String(v));
      }
    });
    const qs = qp.toString() ? `?${qp.toString()}` : "";
    return request<{
      items: StrategyLibraryItem[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
      summary_counts: StrategyLibrarySummary;
    }>(`/workspaces/${workspaceId}/library/strategies${qs}`);
  },

  createLibraryStrategy: (workspaceId: string, payload: {
    name: string;
    description?: string;
    exchange?: string;
    symbol?: string;
    timeframe?: string;
    category?: string;
    trading_mode?: string;
    folder_id?: string | null;
    tags?: string[];
    source?: string;
    spec?: any;
  }) =>
    request<{
      strategy_id: string;
      id: string;
      version_id: string;
      version_number: number;
      name: string;
      spec: StrategySpec;
      validation: ValidationReport;
    }>(`/workspaces/${workspaceId}/library/strategies`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateStrategyMetadata: (workspaceId: string, strategyId: string, payload: {
    name?: string;
    description?: string;
    status?: string;
    folder_id?: string | null;
    tags?: string[];
    is_favorite?: boolean;
  }) =>
    request<{
      id: string;
      strategy_id: string;
      name: string;
      description?: string;
      status: string;
      is_favorite: boolean;
      folder_id?: string | null;
      tags: string[];
      updated_at: string;
    }>(`/workspaces/${workspaceId}/library/strategies/${strategyId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  toggleStrategyFavorite: (workspaceId: string, strategyId: string) =>
    request<{ strategy_id: string; is_favorite: boolean }>(
      `/workspaces/${workspaceId}/library/strategies/${strategyId}/favorite`,
      { method: "POST" }
    ),

  archiveStrategy: (workspaceId: string, strategyId: string) =>
    request<{ strategy_id: string; status: string }>(
      `/workspaces/${workspaceId}/library/strategies/${strategyId}/archive`,
      { method: "POST" }
    ),

  restoreStrategy: (workspaceId: string, strategyId: string) =>
    request<{ strategy_id: string; status: string }>(
      `/workspaces/${workspaceId}/library/strategies/${strategyId}/restore`,
      { method: "POST" }
    ),

  deleteStrategy: (workspaceId: string, strategyId: string) =>
    request<{ strategy_id: string; deleted: boolean }>(
      `/workspaces/${workspaceId}/library/strategies/${strategyId}`,
      { method: "DELETE" }
    ),

  duplicateStrategyInLibrary: (workspaceId: string, strategyId: string) =>
    request<{
      strategy_id: string;
      version_id: string;
      version_number: number;
      name: string;
      status: string;
      spec: StrategySpec;
    }>(`/workspaces/${workspaceId}/library/strategies/${strategyId}/duplicate`, {
      method: "POST",
    }),

  restoreHistoricalVersion: (workspaceId: string, strategyId: string, versionId: string) =>
    request<{
      strategy_id: string;
      version_id: string;
      version_number: number;
      change_summary: string;
      spec: StrategySpec;
    }>(`/workspaces/${workspaceId}/library/strategies/${strategyId}/versions/${versionId}/restore`, {
      method: "POST",
    }),

  getStrategyBacktests: (workspaceId: string, strategyId: string) =>
    request<{
      strategy_id: string;
      strategy_name: string;
      backtests: BacktestHistoryItem[];
      total_runs: number;
    }>(`/workspaces/${workspaceId}/library/strategies/${strategyId}/backtests`),

  compareStrategies: (workspaceId: string, payload: {
    strategy_id_1: string;
    version_id_1?: string | null;
    strategy_id_2: string;
    version_id_2?: string | null;
  }) =>
    request<StrategyComparisonData>(`/workspaces/${workspaceId}/library/strategies/compare`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getFolders: (workspaceId: string) =>
    request<StrategyFolderItem[]>(`/workspaces/${workspaceId}/library/folders`),

  createFolder: (workspaceId: string, payload: { name: string; color?: string; description?: string }) =>
    request<StrategyFolderItem>(`/workspaces/${workspaceId}/library/folders`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateFolder: (workspaceId: string, folderId: string, payload: { name?: string; color?: string; description?: string }) =>
    request<StrategyFolderItem>(`/workspaces/${workspaceId}/library/folders/${folderId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteFolder: (workspaceId: string, folderId: string) =>
    request<{ folder_id: string; deleted: boolean }>(`/workspaces/${workspaceId}/library/folders/${folderId}`, {
      method: "DELETE",
    }),

  getTemplates: (workspaceId: string, params: { category?: string; instrument?: string } = {}) => {
    const qp = new URLSearchParams();
    if (params.category) qp.append("category", params.category);
    if (params.instrument) qp.append("instrument", params.instrument);
    const qs = qp.toString() ? `?${qp.toString()}` : "";
    return request<StrategyTemplateItem[]>(`/workspaces/${workspaceId}/library/templates${qs}`);
  },

  getTemplateDetail: (workspaceId: string, templateId: string) =>
    request<StrategyTemplateItem>(`/workspaces/${workspaceId}/library/templates/${templateId}`),

  createFromTemplate: (workspaceId: string, templateId: string, payload: {
    name?: string;
    exchange?: string;
    symbol?: string;
    capital_inr?: number;
    folder_id?: string | null;
    tags?: string[];
    open_in?: "visual_builder" | "ai_studio";
  }) =>
    request<{
      strategy_id: string;
      id: string;
      version_id: string;
      version_number: number;
      name: string;
      spec: StrategySpec;
      validation: ValidationReport;
      open_in: string;
    }>(`/workspaces/${workspaceId}/library/templates/${templateId}/create`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // System Health
  getHealth: () => request<{ status: string; environment: string; timestamp: string }>("/health"),
  getReadiness: () =>
    request<{
      status: string;
      storage_accessible: boolean;
      live_trading_enabled: boolean;
      sebi_gate_active: boolean;
    }>("/health/ready"),
};
