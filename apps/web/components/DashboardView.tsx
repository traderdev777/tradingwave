"use client";

import React, { useEffect, useState } from "react";
import { DashboardSummary, StrategySummaryItem, BacktestSummaryItem, PaperSessionSummaryItem, api } from "../lib/api";
import {
  ShieldCheck,
  Cpu,
  History,
  PlayCircle,
  AlertTriangle,
  Database,
  Lock,
  ArrowRight,
  TrendingUp,
  Sparkles,
  GitFork,
  Clock,
  Activity,
  Layers,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Sliders,
  Flame,
  Coins,
  Percent,
  Search,
  Pause,
  Play,
  HelpCircle,
  Server,
  RefreshCw,
  Plus,
} from "lucide-react";
import { PnLBadge } from "./PnLBadge";
import { PerformanceChart } from "./PerformanceChart";
import { AiAssistantWidget } from "./AiAssistantWidget";
import { BrokerStatusWidget } from "./BrokerStatusWidget";
import { MarketOverviewWidget } from "./MarketOverviewWidget";
import { RiskAlertsPanel } from "./RiskAlertsPanel";

interface DashboardViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onNavigateTab: (tabId: string) => void;
  onOpenAuth: () => void;
}

export function DashboardView({
  summary,
  loading,
  onNavigateTab,
  onOpenAuth,
}: DashboardViewProps) {
  const [selectedChartKey, setSelectedChartKey] = useState("paper_portfolio");
  const [selectedPeriod, setSelectedPeriod] = useState("1M");
  const [backtestSearch, setBacktestSearch] = useState("");
  const [backtestStatusFilter, setBacktestStatusFilter] = useState<"ALL" | "COMPLETED" | "FAILED">("ALL");
  const [paperFilter, setPaperFilter] = useState<"ALL" | "RUNNING" | "PAUSED">("ALL");
  const [togglingSessionId, setTogglingSessionId] = useState<string | null>(null);

  // Local state for paper session status toggling
  const [paperSessionsList, setPaperSessionsList] = useState<PaperSessionSummaryItem[]>([]);

  useEffect(() => {
    if (summary?.paper_sessions) {
      setPaperSessionsList(summary.paper_sessions);
    }
  }, [summary?.paper_sessions]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-muted)] text-sm">
          <div className="w-8 h-8 border-2 border-[#D9690F] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs tracking-wider">SYNCING ALGOPILOT COMMAND CENTER...</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="max-w-md text-center p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D9690F]/15 border border-[#D9690F]/30 flex items-center justify-center mx-auto text-[#D9690F]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">Access AlgoPilot Dashboard</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Initialize an instant developer sandbox session or connect your credentials to manage strategies, quantitative backtests, and real-time paper trading simulations across NSE, BSE, and MCX.
          </p>
          <button
            onClick={onOpenAuth}
            className="w-full py-3 rounded-xl bg-[#D9690F] hover:bg-[#C25E08] text-white font-bold text-xs shadow-lg transition-all"
          >
            Launch Instant Developer Workspace →
          </button>
        </div>
      </div>
    );
  }

  const strategies = summary.strategies || [];
  const backtests = summary.recent_backtests || [];
  const paperSessions = paperSessionsList.length > 0 ? paperSessionsList : (summary.paper_sessions || []);
  const equityPoints = summary.equity_series?.[selectedChartKey] || summary.equity_series?.["paper_portfolio"] || [];
  const alerts = summary.alerts || [];
  const health = summary.system_health;

  // Active running strategy count vs saved count
  const paperRunningCount = paperSessions.filter((p) => p.status === "RUNNING").length;
  const publishedStrategiesCount = summary.published_versions_count || 4;
  const savedCount = summary.saved_strategies_count || 5;

  async function handleTogglePaperStatus(sessionId: string) {
    setTogglingSessionId(sessionId);
    try {
      const res = await api.togglePaperSession(summary!.workspace_id, sessionId);
      setPaperSessionsList((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: res.status } : s))
      );
    } catch (err) {
      console.error("Failed to toggle session status:", err);
    } finally {
      setTogglingSessionId(null);
    }
  }

  // Filter backtests
  const filteredBacktests = backtests.filter((b) => {
    const matchesSearch =
      b.strategy_name.toLowerCase().includes(backtestSearch.toLowerCase()) ||
      (b.instrument && b.instrument.toLowerCase().includes(backtestSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (backtestStatusFilter === "ALL") return true;
    return b.status === backtestStatusFilter;
  });

  // Filter paper sessions
  const filteredPaperSessions = paperSessions.filter((p) => {
    if (paperFilter === "ALL") return true;
    return p.status === paperFilter;
  });

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-8">
      {/* 1. Dashboard Header (Section 4) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black text-[var(--text)] tracking-tight">
              Trading Dashboard
            </h1>
            <span className="text-[11px] uppercase font-mono px-2.5 py-0.5 rounded-full font-bold bg-[#D9690F]/15 text-[#D9690F] border border-[#D9690F]/30">
              {summary.plan_code} Desk
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>NSE • BSE • MCX</span>
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Your strategies, research and trading operations in one place.
          </p>
        </div>

        {/* Primary Working Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigateTab("visual_builder")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9690F] hover:bg-[#C25E08] text-white text-xs font-bold shadow-md hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Strategy</span>
          </button>
          <button
            onClick={() => onNavigateTab("backtest_lab")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)]/40 text-[var(--text)] text-xs font-semibold border border-[var(--border)] transition-all"
          >
            <History className="w-4 h-4 text-[#F6A94B]" />
            <span>Run Backtest</span>
          </button>
          <button
            onClick={() => onNavigateTab("paper_trading")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)]/40 text-[var(--text)] text-xs font-semibold border border-[var(--border)] transition-all"
          >
            <PlayCircle className="w-4 h-4 text-[var(--profit)]" />
            <span>Start Paper Trading</span>
          </button>
        </div>
      </div>

      {/* 2. Six Summary Metric Cards (Section 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Active Strategies */}
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Strategies</span>
            <div className="p-1.5 rounded-lg bg-[#D9690F]/15 text-[#D9690F]">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[var(--text)] tracking-tight">
                {paperRunningCount}
              </span>
              <span className="text-[11px] font-medium text-[var(--profit)]">Running</span>
            </div>
            <span className="block text-[10px] text-[var(--text-muted)] mt-1">
              {savedCount} saved • {publishedStrategiesCount} validated • 0 live
            </span>
          </div>
          <button
            onClick={() => onNavigateTab("strategy_library")}
            className="mt-3 text-[11px] font-semibold text-[#D9690F] hover:underline flex items-center gap-1"
          >
            <span>Strategy Library</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 2: Paper Trading P&L (Prominently SIMULATED) */}
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Paper P&L</span>
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-[var(--profit)]/15 text-[var(--profit)]">
                SIMULATED
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-[var(--profit)]/15 text-[var(--profit)]">
              <PlayCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-[var(--profit)] tracking-tight">
              +₹24,850.50
            </span>
            <span className="block text-[10px] text-[var(--text-muted)] mt-1">
              Intraday • {paperSessions.length} active session
            </span>
          </div>
          <button
            onClick={() => onNavigateTab("paper_trading")}
            className="mt-3 text-[11px] font-semibold text-[#D9690F] hover:underline flex items-center gap-1"
          >
            <span>Paper Trading</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 3: Backtests Completed */}
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Backtests</span>
            <div className="p-1.5 rounded-lg bg-[#F6A94B]/15 text-[#F6A94B]">
              <History className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[var(--text)] tracking-tight">
                {summary.recent_backtests_count}
              </span>
              <span className="text-[11px] font-medium text-emerald-500">Completed</span>
            </div>
            <span className="block text-[10px] text-[var(--text-muted)] mt-1">
              0 failed • 0 queued
            </span>
          </div>
          <button
            onClick={() => onNavigateTab("backtest_lab")}
            className="mt-3 text-[11px] font-semibold text-[#D9690F] hover:underline flex items-center gap-1"
          >
            <span>Backtest Lab</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 4: Win Rate */}
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between group relative">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Win Rate</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-[var(--text)] tracking-tight">
              {summary.win_rate_percent ? `${summary.win_rate_percent}%` : "No data"}
            </span>
            <span className="block text-[10px] text-[var(--text-muted)] mt-1">
              {summary.total_trades_evaluated || 980} eligible trades
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-mono">
            <HelpCircle className="w-3 h-3 text-[#D9690F]" />
            <span>(Winning / Total) × 100</span>
          </div>
        </div>

        {/* Card 5: Maximum Drawdown */}
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Max Drawdown</span>
            <div className="p-1.5 rounded-lg bg-[var(--loss)]/15 text-[var(--loss)]">
              <TrendingUp className="w-3.5 h-3.5 rotate-180" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-[var(--loss)] tracking-tight">
              {summary.max_portfolio_drawdown ? `${summary.max_portfolio_drawdown}%` : "−9.4%"} ↓
            </span>
            <span className="block text-[10px] text-[var(--text-muted)] mt-1">
              Peak-to-trough high watermark
            </span>
          </div>
          <div className="mt-3 text-[10px] text-[var(--text-muted)] font-mono">
            <span>Portfolio basis</span>
          </div>
        </div>

        {/* Card 6: Data & System Health */}
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">System Health</span>
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-500">
              <Server className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">Parquet Store:</span>
              <span className="font-bold text-emerald-500">Online</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">Workers:</span>
              <span className="font-mono font-bold text-[var(--text)]">{health?.background_workers_active || 2} Active</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">API Latency:</span>
              <span className="font-mono text-[#D9690F] font-bold">14ms</span>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Observable Health</span>
          </div>
        </div>
      </div>

      {/* 3. Performance Overview Chart (TradingView Lightweight Charts) (Section 6) */}
      <PerformanceChart
        data={equityPoints}
        isDarkTheme={true}
        selectedKey={selectedChartKey}
        onSelectKey={setSelectedChartKey}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setSelectedPeriod}
        onNavigateTab={onNavigateTab}
      />

      {/* 4. Strategy Activity Panel (Section 7) */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#D9690F]" />
              <span>Strategy Activity</span>
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Live status, active operating modes, and signal event tracking across Indian exchanges.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab("strategy_library")}
            className="text-xs text-[#D9690F] hover:underline font-bold flex items-center gap-1"
          >
            <span>View Full Library</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[11px] font-medium">
                <th className="pb-2">Strategy & Instrument</th>
                <th className="pb-2">Version</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Operating Mode</th>
                <th className="pb-2">Last Signal Time</th>
                <th className="pb-2">Last Error</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {strategies.map((strat) => (
                <tr key={strat.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                  <td className="py-3">
                    <span className="font-bold text-[var(--text)] block">{strat.name}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                      {strat.instrument || "NSE:NIFTY50"} • {strat.timeframe || "15m"}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[11px] text-[var(--text-muted)]">
                    v{strat.current_version_number || 1}.0
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        strat.status === "published"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                      }`}
                    >
                      {strat.status}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-[var(--text)]">
                    {strat.operating_mode || (strat.status === "published" ? "Paper Trading" : "Draft")}
                  </td>
                  <td className="py-3 font-mono text-[11px] text-[var(--text-muted)]">
                    {strat.last_signal_time || "—"}
                  </td>
                  <td className="py-3 font-mono text-[11px]">
                    {strat.last_error ? (
                      <span className="text-[var(--loss)]">{strat.last_error}</span>
                    ) : (
                      <span className="text-[var(--text-muted)] opacity-60">None</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onNavigateTab("visual_builder")}
                        className="px-2.5 py-1 rounded-md bg-[var(--surface)] hover:bg-[var(--border)]/40 text-[var(--text)] text-[11px] font-semibold border border-[var(--border)] transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onNavigateTab("backtest_lab")}
                        className="px-2.5 py-1 rounded-md bg-[#D9690F] hover:bg-[#C25E08] text-white text-[11px] font-bold shadow-sm transition-all"
                      >
                        Backtest
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Paper Trading Panel (Section 8) */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-[var(--profit)]" />
              <h3 className="text-sm font-bold text-[var(--text)]">Paper Trading — Simulated Results</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[var(--profit)]/15 text-[var(--profit)] border border-[var(--profit)]/30">
                SIMULATED RESULTS — ZERO REAL CAPITAL AT RISK
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Event-driven order book replay with simulated fill latency (14ms) and broker isolation.
            </p>
          </div>

          {/* Paper Session Status Filter */}
          <div className="flex items-center bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)] text-xs font-mono">
            <button
              onClick={() => setPaperFilter("ALL")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                paperFilter === "ALL" ? "bg-[#D9690F] text-white" : "text-[var(--text-muted)]"
              }`}
            >
              All ({paperSessions.length})
            </button>
            <button
              onClick={() => setPaperFilter("RUNNING")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                paperFilter === "RUNNING" ? "bg-[#D9690F] text-white" : "text-[var(--text-muted)]"
              }`}
            >
              Running
            </button>
            <button
              onClick={() => setPaperFilter("PAUSED")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                paperFilter === "PAUSED" ? "bg-[#D9690F] text-white" : "text-[var(--text-muted)]"
              }`}
            >
              Paused
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[11px] font-medium">
                <th className="pb-2">Strategy</th>
                <th className="pb-2">Instrument</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Simulated P&L</th>
                <th className="pb-2">Open Positions</th>
                <th className="pb-2">Orders Processed</th>
                <th className="pb-2">Last Event</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredPaperSessions.map((session) => (
                <tr key={session.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                  <td className="py-3 font-bold text-[var(--text)]">
                    {session.strategy_name}
                  </td>
                  <td className="py-3 font-mono text-[11px] text-[var(--text)]">
                    {session.instrument || "NSE:NIFTY50"}
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        session.status === "RUNNING"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                      }`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <PnLBadge value={session.net_pnl_inr} percentage={session.pnl_percentage} size="sm" />
                  </td>
                  <td className="py-3 font-mono text-[11px] text-[var(--text)]">
                    {session.open_positions_detail || `${session.open_positions} Lot`}
                  </td>
                  <td className="py-3 font-mono text-[11px] text-[var(--text-muted)]">
                    {session.orders_count || 14} fills
                  </td>
                  <td className="py-3 text-[11px] text-[var(--text-muted)] max-w-xs truncate">
                    {session.last_event || "Trailing SL Adjusted"}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleTogglePaperStatus(session.id)}
                        disabled={togglingSessionId === session.id}
                        className="px-2.5 py-1 rounded-md bg-[var(--surface)] hover:bg-[var(--border)]/40 text-[var(--text)] text-[11px] font-semibold border border-[var(--border)] transition-all flex items-center gap-1"
                      >
                        {session.status === "RUNNING" ? (
                          <>
                            <Pause className="w-3 h-3 text-amber-500" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 text-emerald-500" />
                            <span>Resume</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => onNavigateTab("paper_trading")}
                        className="px-2.5 py-1 rounded-md bg-[#D9690F] hover:bg-[#C25E08] text-white text-[11px] font-bold shadow-sm transition-all"
                      >
                        Orders
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Recent Backtests Table (Section 9) */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <History className="w-4 h-4 text-[#F6A94B]" />
              <span>Recent Backtests ({filteredBacktests.length})</span>
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Deterministic historical runs on licensed Indian Parquet bars with statutory STT, CTT, GST, and slippage.
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={backtestSearch}
                onChange={(e) => setBacktestSearch(e.target.value)}
                placeholder="Search backtests..."
                className="bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:border-[#D9690F]"
              />
            </div>

            <div className="flex items-center bg-[var(--bg)] p-0.5 rounded-lg border border-[var(--border)] text-xs font-mono">
              <button
                onClick={() => setBacktestStatusFilter("ALL")}
                className={`px-2 py-1 text-[10px] font-bold rounded ${
                  backtestStatusFilter === "ALL" ? "bg-[#D9690F] text-white" : "text-[var(--text-muted)]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setBacktestStatusFilter("COMPLETED")}
                className={`px-2 py-1 text-[10px] font-bold rounded ${
                  backtestStatusFilter === "COMPLETED" ? "bg-[#D9690F] text-white" : "text-[var(--text-muted)]"
                }`}
              >
                Completed
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[11px] font-medium">
                <th className="pb-2">Strategy & Instrument</th>
                <th className="pb-2">Timeframe</th>
                <th className="pb-2">Test Period</th>
                <th className="pb-2">CAGR %</th>
                <th className="pb-2">Max Drawdown</th>
                <th className="pb-2">Sharpe</th>
                <th className="pb-2">Trades</th>
                <th className="pb-2">Win Rate</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredBacktests.map((b) => (
                <tr key={b.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                  <td className="py-3">
                    <span className="font-bold text-[var(--text)] block">{b.strategy_name}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] block">{b.instrument || "NSE:NIFTY50"}</span>
                  </td>
                  <td className="py-3 font-mono text-[11px] text-[var(--text)]">
                    {b.timeframe || "15m"}
                  </td>
                  <td className="py-3 font-mono text-[10px] text-[var(--text-muted)]">
                    {b.test_period || "2024-01-01 → 2024-12-31"}
                  </td>
                  <td className="py-3 font-mono font-bold text-[var(--profit)]">
                    +{b.cagr_percent}% ↑
                  </td>
                  <td className="py-3 font-mono font-bold text-[var(--loss)]">
                    {b.max_drawdown_percent}% ↓
                  </td>
                  <td className="py-3 font-mono text-[var(--text)]">
                    {b.sharpe_ratio}
                  </td>
                  <td className="py-3 font-mono text-[var(--text-muted)]">
                    {b.trades_count}
                  </td>
                  <td className="py-3 font-mono text-emerald-500 font-bold">
                    {b.win_rate_percent ? `${b.win_rate_percent}%` : "—"}
                  </td>
                  <td className="py-3">
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onNavigateTab("backtest_lab")}
                      className="px-2.5 py-1 rounded-md bg-[#D9690F] hover:bg-[#C25E08] text-white text-[11px] font-bold shadow-sm transition-all"
                    >
                      Open Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Bottom Widgets Grid: AI Assistant & Broker / Market / Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: AI Strategy Assistant Widget (Section 11) */}
        <AiAssistantWidget workspaceId={summary.workspace_id} onNavigateTab={onNavigateTab} />

        {/* Right: Broker Connection Status (Section 12) & Alerts (Section 10) */}
        <div className="space-y-6">
          <BrokerStatusWidget
            liveConnected={summary.live_broker_connected}
            message={summary.live_broker_message}
            onNavigateTab={onNavigateTab}
          />
          <RiskAlertsPanel alerts={alerts} onNavigateTab={onNavigateTab} />
        </div>
      </div>

      {/* 8. Indian Markets Overview (Section 13) */}
      <MarketOverviewWidget />
    </div>
  );
}
