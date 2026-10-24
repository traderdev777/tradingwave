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
} from "lucide-react";

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
        <div className="flex flex-col items-center gap-3 text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading workspace state from database...</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="max-w-md text-center p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-800 flex items-center justify-center mx-auto text-cyan-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Authentication Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sign in or create a developer account to access workspace strategies, quantitative backtests, and real-time paper trading simulations.
          </p>
          <button
            onClick={onOpenAuth}
            className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md transition-all"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Workspace Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Persisted metrics for <span className="text-cyan-400 font-semibold">{summary.workspace_name}</span>{" "}
            (Plan: <span className="uppercase font-mono text-[11px] text-slate-300">{summary.plan_code}</span>)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab("ai_studio")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <span>+ Draft in AI Studio</span>
          </button>
          <button
            onClick={() => onNavigateTab("visual_builder")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
          >
            <span>Open Visual Builder</span>
          </button>
        </div>
      </div>

      {/* Persisted Metrics 4-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Saved Strategies */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Saved Strategies</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">
              {summary.saved_strategies_count}
            </span>
            <span className="block text-[11px] text-slate-500 mt-1">
              {summary.published_versions_count} published versions
            </span>
          </div>
        </div>

        {/* Metric 2: Recent Backtests */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Historical Backtests</span>
            <History className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">
              {summary.recent_backtests_count}
            </span>
            <span className="block text-[11px] text-slate-500 mt-1">
              Event-driven simulation runs
            </span>
          </div>
        </div>

        {/* Metric 3: Running Paper Sessions */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Paper Sessions</span>
            <PlayCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">
              {summary.running_paper_sessions_count}
            </span>
            <span className="block text-[11px] text-slate-500 mt-1">
              Active virtual replays
            </span>
          </div>
        </div>

        {/* Metric 4: Risk Limits Status */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Max Daily Loss Limit</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white">
              ₹{summary.risk_limits?.daily_loss_limit_inr?.toLocaleString("en-IN") || "10,000"}
            </span>
            <span className="block text-[11px] text-slate-500 mt-1">
              Hard circuit limit enforced
            </span>
          </div>
        </div>
      </div>

      {/* Core Operational Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Strategies & Backtests Real Empty/List State */}
        <div className="lg:col-span-2 space-y-6">
          {/* Saved Strategies Widget */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Strategy Library State</span>
              </h3>
              <button
                onClick={() => onNavigateTab("strategy_library")}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {summary.saved_strategies_count === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-800 rounded-lg p-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <TrendingUp className="w-5 h-5 text-slate-500" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">No Strategies Saved Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Create your first deterministic trading rule using natural language in AI Studio or assemble indicators with our visual graph builder.
                </p>
                <button
                  onClick={() => onNavigateTab("ai_studio")}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-sm transition-all"
                >
                  Create Strategy Draft
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-300">
                You have {summary.saved_strategies_count} strategy registered in this workspace.
              </div>
            )}
          </div>

          {/* Historical Backtest Log State */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <span>Simulation Activity</span>
              </h3>
              <button
                onClick={() => onNavigateTab("backtest_lab")}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                <span>Backtest Lab</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {summary.recent_backtests_count === 0 ? (
              <div className="py-6 text-center border border-dashed border-slate-800 rounded-lg p-4 text-xs text-slate-400">
                No backtest jobs executed in this workspace. Run a backtest in the Backtest Lab on licensed Indian historical data.
              </div>
            ) : (
              <div className="text-xs text-slate-300">
                {summary.recent_backtests_count} historical simulation jobs recorded.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Risk Limits & Broker Gate Status */}
        <div className="space-y-6">
          {/* Configured Risk Limits */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Workspace Risk Controls</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Max Open Positions</span>
                <span className="font-mono font-semibold text-slate-200">
                  {summary.risk_limits?.max_open_positions || 3}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Max Portfolio Exposure</span>
                <span className="font-mono font-semibold text-slate-200">
                  ₹{summary.risk_limits?.max_exposure_inr?.toLocaleString("en-IN") || "2,00,000"}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Daily Circuit Loss Limit</span>
                <span className="font-mono font-semibold text-red-400">
                  ₹{summary.risk_limits?.daily_loss_limit_inr?.toLocaleString("en-IN") || "10,000"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Max Drawdown Stop</span>
                <span className="font-mono font-semibold text-amber-400">
                  {summary.risk_limits?.max_drawdown_percent || 15}%
                </span>
              </div>
            </div>
          </div>

          {/* Live Broker Connection & SEBI Gate */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <h3 className="text-sm font-bold">Broker Execution Gated</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {summary.live_broker_message}
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div>Broker Gateway: <span className="text-amber-400">Disconnected</span></div>
              <div>SEBI Circular: <span className="text-cyan-400">Feb 2025 Compliant</span></div>
              <div>NSE Algo Empanelment: <span className="text-slate-500">Pending Review</span></div>
            </div>
          </div>

          {/* Data Partition Status */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center gap-3">
            <Database className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="block font-semibold text-slate-200">Indian Market Dataset</span>
              <span className="block text-[11px] text-slate-500">NSE EQ & FO Parquet Partition (Storage Local)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
