"use client";

import React from "react";
import { DashboardSummary } from "../lib/api";
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
} from "lucide-react";
import { PnLBadge } from "./PnLBadge";

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
  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-muted)] text-sm">
          <div className="w-6 h-6 border-2 border-[#D9690F] border-t-transparent rounded-full animate-spin" />
          <span>Loading workspace state from database...</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="max-w-md text-center p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D9690F]/15 border border-[#D9690F]/30 flex items-center justify-center mx-auto text-[#D9690F]">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text)]">Authentication Required</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Sign in or create a developer account to access workspace strategies, quantitative backtests, and real-time paper trading simulations.
          </p>
          <button
            onClick={onOpenAuth}
            className="w-full py-2.5 rounded-lg bg-[var(--primary)] hover:opacity-90 text-[var(--primary-text)] font-semibold text-xs shadow-md transition-all"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
              Workspace Overview
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-semibold bg-[#D9690F]/15 text-[#D9690F] border border-[#D9690F]/30">
              {summary.plan_code}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Persisted quantitative records for{" "}
            <span className="text-[#D9690F] font-semibold">{summary.workspace_name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab("ai_studio")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D9690F] hover:bg-[#C25E08] text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Draft in AI Studio</span>
          </button>
          <button
            onClick={() => onNavigateTab("visual_builder")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)]/30 text-[var(--text)] text-xs font-medium border border-[var(--border)] transition-all"
          >
            <GitFork className="w-3.5 h-3.5 text-[#D9690F]" />
            <span>Open Visual Builder</span>
          </button>
        </div>
      </div>

      {/* Persisted Metrics 4-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Saved Strategies */}
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-medium">Saved Strategies</span>
            <Cpu className="w-4 h-4 text-[#D9690F]" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-[var(--text)]">
              {summary.saved_strategies_count}
            </span>
            <span className="block text-[11px] text-[var(--text-muted)] mt-1">
              {summary.published_versions_count} published versions
            </span>
          </div>
        </div>

        {/* Metric 2: Recent Backtests */}
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-medium">Historical Backtests</span>
            <History className="w-4 h-4 text-[#F6A94B]" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-[var(--text)]">
              {summary.recent_backtests_count}
            </span>
            <span className="block text-[11px] text-[var(--text-muted)] mt-1">
              Deterministic simulation runs
            </span>
          </div>
        </div>

        {/* Metric 3: Running Paper Sessions */}
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-medium">Paper Sessions</span>
            <PlayCircle className="w-4 h-4 text-[var(--profit)]" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-[var(--text)]">
              {summary.running_paper_sessions_count}
            </span>
            <span className="block text-[11px] text-[var(--text-muted)] mt-1">
              Virtual replay state machines
            </span>
          </div>
        </div>

        {/* Metric 4: Daily Circuit Stop */}
        <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-medium">Daily Loss Circuit</span>
            <ShieldCheck className="w-4 h-4 text-[var(--loss)]" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-[var(--text)]">
              ₹{summary.risk_limits?.daily_loss_limit_inr?.toLocaleString("en-IN") || "10,000"}
            </span>
            <span className="block text-[11px] text-[var(--text-muted)] mt-1">
              Pre-trade hard stop enforced
            </span>
          </div>
        </div>
      </div>

      {/* Accessible P&L Preview Banner (Demonstrating Colorblind-Safe Directional Arrows & Signs) */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D9690F]/15 text-[#D9690F] flex items-center justify-center font-bold text-xs">
            ♿
          </div>
          <div>
            <span className="block text-xs font-semibold text-[var(--text)]">
              Colorblind-Accessible Trading Ledger Previews
            </span>
            <span className="block text-[11px] text-[var(--text-muted)]">
              All quantitative metrics combine distinct arrows (↑ / ↓) and mathematical signs (+ / −) with compliant color contrast.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PnLBadge value={18450.5} percentage={4.12} size="md" />
          <PnLBadge value={-6230.0} percentage={-1.38} size="md" />
          <PnLBadge value={0.0} size="md" />
        </div>
      </div>

      {/* Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Strategies and Simulations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Strategy Library State */}
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#D9690F]" />
                <span>Strategy Library State</span>
              </h3>
              <button
                onClick={() => onNavigateTab("strategy_library")}
                className="text-xs text-[#D9690F] hover:opacity-80 flex items-center gap-1 font-semibold"
              >
                <span>View Library</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {summary.saved_strategies_count === 0 ? (
              <div className="py-8 text-center border border-dashed border-[var(--border)] rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                  <TrendingUp className="w-5 h-5 text-[#D9690F]" />
                </div>
                <h4 className="text-sm font-semibold text-[var(--text)]">No Strategies Saved Yet</h4>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                  Create your first deterministic trading rule using natural language in AI Studio or assemble indicators with our visual graph builder.
                </p>
                <button
                  onClick={() => onNavigateTab("ai_studio")}
                  className="px-3.5 py-1.5 rounded-lg bg-[#D9690F] hover:bg-[#C25E08] text-white font-semibold text-xs shadow-sm transition-all"
                >
                  Create Strategy Draft
                </button>
              </div>
            ) : (
              <div className="text-xs text-[var(--text)]">
                You have {summary.saved_strategies_count} strategy registered in this workspace.
              </div>
            )}
          </div>

          {/* Historical Simulation Activity */}
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <History className="w-4 h-4 text-[#F6A94B]" />
                <span>Simulation Activity</span>
              </h3>
              <button
                onClick={() => onNavigateTab("backtest_lab")}
                className="text-xs text-[#D9690F] hover:opacity-80 flex items-center gap-1 font-semibold"
              >
                <span>Backtest Lab</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {summary.recent_backtests_count === 0 ? (
              <div className="py-6 text-center border border-dashed border-[var(--border)] rounded-lg p-4 text-xs text-[var(--text-muted)]">
                No backtest jobs executed in this workspace. Run a backtest in the Backtest Lab on licensed Indian historical data.
              </div>
            ) : (
              <div className="text-xs text-[var(--text)]">
                {summary.recent_backtests_count} historical simulation jobs recorded.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Risk Limits & Broker Gate Status */}
        <div className="space-y-6">
          {/* Configured Risk Limits */}
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D9690F]" />
              <span>Workspace Risk Controls</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Max Open Positions</span>
                <span className="font-mono font-semibold text-[var(--text)]">
                  {summary.risk_limits?.max_open_positions || 3}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Max Exposure Limit</span>
                <span className="font-mono font-semibold text-[var(--text)]">
                  ₹{summary.risk_limits?.max_exposure_inr?.toLocaleString("en-IN") || "2,00,000"}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Daily Loss Circuit</span>
                <span className="font-mono font-semibold text-[var(--loss)]">
                  ₹{summary.risk_limits?.daily_loss_limit_inr?.toLocaleString("en-IN") || "10,000"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Max Drawdown Stop</span>
                <span className="font-mono font-semibold text-amber-500">
                  {summary.risk_limits?.max_drawdown_percent || 15}%
                </span>
              </div>
            </div>
          </div>

          {/* Live Broker Connection & SEBI Gate */}
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <h3 className="text-sm font-bold">Broker Execution Gated</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {summary.live_broker_message}
            </p>
            <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)] space-y-1">
              <div>Broker Gateway: <span className="text-amber-500 font-semibold">Disconnected</span></div>
              <div>SEBI Circular: <span className="text-[#D9690F] font-semibold">Feb 2025 Standard</span></div>
              <div>Exchange Empanelment: <span className="opacity-70">Locked (Gate D/E)</span></div>
            </div>
          </div>

          {/* Historical Data Ingestion Status */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex items-center gap-3">
            <Database className="w-5 h-5 text-[#D9690F] flex-shrink-0" />
            <div className="text-xs">
              <span className="block font-semibold text-[var(--text)]">Indian Market Data</span>
              <span className="block text-[11px] text-[var(--text-muted)]">
                Licensed Parquet Dataset Partition (Storage Local)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
