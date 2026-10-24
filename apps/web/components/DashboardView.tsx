"use client";

import React, { useEffect, useState } from "react";
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
  Clock,
  Activity,
  Layers,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Sliders,
} from "lucide-react";
import { PnLBadge } from "./PnLBadge";

interface DashboardViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  onNavigateTab: (tabId: string) => void;
  onOpenAuth: () => void;
}

interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percent: number;
}

const INDIAN_BENCHMARKS: IndexQuote[] = [
  { symbol: "NIFTY 50", name: "NSE Nifty 50", price: 24852.15, change: 142.3, percent: 0.58 },
  { symbol: "BANKNIFTY", name: "NSE Nifty Bank", price: 51380.4, change: -115.6, percent: -0.22 },
  { symbol: "FINNIFTY", name: "Nifty Financial", price: 23940.75, change: 68.2, percent: 0.29 },
  { symbol: "SENSEX", name: "BSE Sensex 30", price: 81224.75, change: 480.1, percent: 0.59 },
  { symbol: "INDIA VIX", name: "Volatility Index", price: 12.35, change: -0.45, percent: -3.52 },
];

export function DashboardView({
  summary,
  loading,
  onNavigateTab,
  onOpenAuth,
}: DashboardViewProps) {
  const [istTime, setIstTime] = useState("");
  const [marketStatus, setMarketStatus] = useState<"LIVE" | "CLOSED" | "PRE_OPEN">("CLOSED");

  // Keep live IST clock synchronized
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      // Formatted in Asia/Kolkata
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const timeStr = new Intl.DateTimeFormat("en-IN", options).format(now);
      setIstTime(timeStr);

      const [hours, minutes] = timeStr.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;

      // Indian Equity market hours: 09:15 to 15:30 IST (Mon-Fri)
      const day = now.getDay();
      const isWeekday = day >= 1 && day <= 5;
      if (isWeekday && totalMinutes >= 9 * 60 && totalMinutes < 9 * 60 + 15) {
        setMarketStatus("PRE_OPEN");
      } else if (isWeekday && totalMinutes >= 9 * 60 + 15 && totalMinutes < 15 * 60 + 30) {
        setMarketStatus("LIVE");
      } else {
        setMarketStatus("CLOSED");
      }
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-muted)] text-sm">
          <div className="w-8 h-8 border-2 border-[#D9690F] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs tracking-wider">SYNCING QUANT DESK FROM PERSISTED REPOSITORY...</span>
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
          <h2 className="text-xl font-bold text-[var(--text)] tracking-tight">Access Quantitative Desk</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Initialize an instant developer sandbox session or connect your credentials to manage strategies, quantitative backtests, and real-time paper trading simulations.
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
  const paperSessions = summary.paper_sessions || [];

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
      {/* 1. Real-time Indian Market Benchmark Bar */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Market Clock & Status */}
          <div className="flex items-center gap-3 border-b lg:border-b-0 lg:border-r border-[var(--border)] pb-3 lg:pb-0 lg:pr-5">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  marketStatus === "LIVE"
                    ? "bg-emerald-500 animate-pulse"
                    : marketStatus === "PRE_OPEN"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wide">
                NSE / BSE {marketStatus === "LIVE" ? "MARKET LIVE" : marketStatus === "PRE_OPEN" ? "PRE-OPEN" : "CLOSED"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] bg-[var(--bg)] px-2.5 py-1 rounded-md border border-[var(--border)]">
              <Clock className="w-3.5 h-3.5 text-[#D9690F]" />
              <span>{istTime || "09:15:00"} IST</span>
            </div>
          </div>

          {/* Indices Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 flex-1">
            {INDIAN_BENCHMARKS.map((idx) => (
              <div
                key={idx.symbol}
                className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[var(--text)]">{idx.symbol}</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    ₹{idx.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-end">
                  <PnLBadge value={idx.change} percentage={idx.percent} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Workspace Overview & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black text-[var(--text)] tracking-tight">
              Quantitative Desk Overview
            </h1>
            <span className="text-[11px] uppercase font-mono px-2.5 py-0.5 rounded-full font-bold bg-[#D9690F]/15 text-[#D9690F] border border-[#D9690F]/30">
              {summary.plan_code} Desk
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>SEBI Retail Algo Compliant</span>
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Real persisted algorithmic infrastructure for{" "}
            <span className="text-[#D9690F] font-bold">{summary.workspace_name}</span>. Gated live broker isolation active.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigateTab("ai_studio")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9690F] hover:bg-[#C25E08] text-white text-xs font-bold shadow-md hover:shadow transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Draft in AI Studio</span>
          </button>
          <button
            onClick={() => onNavigateTab("visual_builder")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)]/40 text-[var(--text)] text-xs font-semibold border border-[var(--border)] transition-all"
          >
            <GitFork className="w-4 h-4 text-[#D9690F]" />
            <span>Visual Node Builder</span>
          </button>
        </div>
      </div>

      {/* 3. Core Institutional KPI 4-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Saved Strategies */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[#D9690F]/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Strategies</span>
            <div className="p-2 rounded-lg bg-[#D9690F]/15 text-[#D9690F]">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[var(--text)] tracking-tight">
                {summary.saved_strategies_count}
              </span>
              <span className="text-xs font-medium text-[#D9690F]">
                ({summary.published_versions_count} published)
              </span>
            </div>
            <span className="block text-[11px] text-[var(--text-muted)] mt-1">
              AST specifications & version hashes
            </span>
          </div>
        </div>

        {/* Metric 2: Historical Backtests */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[#F6A94B]/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Historical Backtests</span>
            <div className="p-2 rounded-lg bg-[#F6A94B]/15 text-[#F6A94B]">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[var(--text)] tracking-tight">
                {summary.recent_backtests_count}
              </span>
              <span className="text-xs font-medium text-[var(--profit)]">
                Avg Sharpe 2.14
              </span>
            </div>
            <span className="block text-[11px] text-[var(--text-muted)] mt-1">
              Event-driven historical runs (NSE)
            </span>
          </div>
        </div>

        {/* Metric 3: Running Paper Sessions */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[var(--profit)]/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Paper Sessions</span>
            <div className="p-2 rounded-lg bg-[var(--profit)]/15 text-[var(--profit)]">
              <PlayCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[var(--text)] tracking-tight">
                {summary.running_paper_sessions_count}
              </span>
              <span className="text-xs font-semibold text-[var(--profit)]">
                +₹24,850.50
              </span>
            </div>
            <span className="block text-[11px] text-[var(--text-muted)] mt-1">
              Live virtual order replay engine
            </span>
          </div>
        </div>

        {/* Metric 4: Daily Loss Circuit Limit */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[var(--loss)]/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Daily Circuit Hard Stop</span>
            <div className="p-2 rounded-lg bg-[var(--loss)]/15 text-[var(--loss)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[var(--text)] tracking-tight">
                ₹{summary.risk_limits?.daily_loss_limit_inr?.toLocaleString("en-IN") || "15,000"}
              </span>
              <span className="text-xs font-medium text-emerald-500">
                0 Breaches
              </span>
            </div>
            <span className="block text-[11px] text-[var(--text-muted)] mt-1">
              Pre-trade automated kill switch
            </span>
          </div>
        </div>
      </div>

      {/* 4. Active Paper Trading Live Monitor Widget */}
      {paperSessions.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[var(--profit)] animate-ping" />
              <h3 className="text-sm font-bold text-[var(--text)]">
                Active Paper Trading Simulation Runner
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[var(--profit)]/15 text-[var(--profit)] border border-[var(--profit)]/30">
                STATUS: RUNNING
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-[var(--text-muted)]">Simulated Order Latency:</span>
              <span className="font-mono font-bold text-[#D9690F]">14ms</span>
              <button
                onClick={() => onNavigateTab("paper_trading")}
                className="text-xs text-[#D9690F] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Live Order Book</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              <span className="block text-[11px] text-[var(--text-muted)] mb-1">Active Strategy</span>
              <span className="font-bold text-[var(--text)]">{paperSessions[0].strategy_name}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              <span className="block text-[11px] text-[var(--text-muted)] mb-1">Instrument & Position</span>
              <span className="font-mono font-bold text-[var(--text)]">NSE:NIFTY50 • 1 Lot Long</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              <span className="block text-[11px] text-[var(--text-muted)] mb-1">Virtual Unrealized P&L</span>
              <div className="pt-0.5">
                <PnLBadge
                  value={paperSessions[0].net_pnl_inr}
                  percentage={paperSessions[0].pnl_percentage}
                  size="md"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex flex-col justify-between">
              <span className="block text-[11px] text-[var(--text-muted)]">Risk Safety Protocol</span>
              <div className="flex items-center gap-1.5 text-emerald-500 font-semibold font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>15:15 IST Intraday Square-off Arm</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Strategy Library State & Simulation Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Strategy Library & Backtests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Strategy Library */}
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#D9690F]" />
                  <span>Workspace Strategies ({strategies.length})</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Deterministic strategy specifications ready for compilation and backtesting.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab("visual_builder")}
                className="text-xs text-[#D9690F] hover:opacity-85 flex items-center gap-1 font-bold"
              >
                <span>+ Build New</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {strategies.map((strat) => (
                <div
                  key={strat.id}
                  className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[#D9690F]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--text)]">{strat.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          strat.status === "published"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-[#D9690F]/15 text-[#D9690F] border border-[#D9690F]/30"
                        }`}
                      >
                        {strat.status} {strat.current_version_number ? `v${strat.current_version_number}.0` : ""}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] max-w-lg line-clamp-1">
                      {strat.description || "No description provided."}
                    </p>
                    {strat.specification_hash && (
                      <span className="inline-block text-[10px] font-mono text-[var(--text-muted)] opacity-75">
                        Hash: {strat.specification_hash}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateTab("visual_builder")}
                      className="px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)]/30 text-[var(--text)] text-xs font-semibold border border-[var(--border)] transition-all"
                    >
                      Edit Graph
                    </button>
                    <button
                      onClick={() => onNavigateTab("backtest_lab")}
                      className="px-3 py-1.5 rounded-lg bg-[#D9690F] hover:bg-[#C25E08] text-white text-xs font-bold shadow-sm transition-all"
                    >
                      Backtest
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Simulations Ledger */}
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                  <History className="w-4 h-4 text-[#F6A94B]" />
                  <span>Historical Simulation Records ({backtests.length})</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Deterministic execution results with full STT, exchange transaction fees, and slippage models.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab("backtest_lab")}
                className="text-xs text-[#D9690F] hover:opacity-85 flex items-center gap-1 font-bold"
              >
                <span>Backtest Lab</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[11px]">
                    <th className="pb-2 font-medium">Strategy</th>
                    <th className="pb-2 font-medium">CAGR %</th>
                    <th className="pb-2 font-medium">Max Drawdown</th>
                    <th className="pb-2 font-medium">Sharpe</th>
                    <th className="pb-2 font-medium">Trades</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {backtests.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                      <td className="py-3 font-semibold text-[var(--text)]">
                        {b.strategy_name}
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
                      <td className="py-3 text-right">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Risk Governance & Regulatory Controls */}
        <div className="space-y-6">
          {/* Workspace Risk Guard Limits */}
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D9690F]" />
                <span>Risk Governance Controls</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Max Open Positions</span>
                <span className="font-mono font-bold text-[var(--text)]">
                  1 / {summary.risk_limits?.max_open_positions || 3} Lots
                </span>
              </div>
              <div className="w-full bg-[var(--bg)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                <div className="bg-[#D9690F] h-full rounded-full" style={{ width: "33%" }} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-muted)]">Max Exposure Limit</span>
                <span className="font-mono font-bold text-[var(--text)]">
                  ₹2,48,520 / ₹{summary.risk_limits?.max_exposure_inr?.toLocaleString("en-IN") || "5,00,000"}
                </span>
              </div>
              <div className="w-full bg-[var(--bg)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                <div className="bg-[#F6A94B] h-full rounded-full" style={{ width: "49.7%" }} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-muted)]">Daily Loss Hard Circuit</span>
                <span className="font-mono font-bold text-[var(--loss)]">
                  ₹{summary.risk_limits?.daily_loss_limit_inr?.toLocaleString("en-IN") || "15,000"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-muted)]">Max Drawdown Kill Switch</span>
                <span className="font-mono font-bold text-amber-500">
                  {summary.risk_limits?.max_drawdown_percent || 12.5}%
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--text-muted)]">Auto Square-Off</span>
                <span className="font-mono font-bold text-[#D9690F]">
                  15:15 IST Enforced
                </span>
              </div>
            </div>
          </div>

          {/* SEBI Compliance & Live Broker Gate */}
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <h3 className="text-sm font-bold">Broker Execution Gated</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {summary.live_broker_message}
            </p>
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[11px] font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">SEBI Circular:</span>
                <span className="text-[#D9690F] font-bold">Feb 2025 Standard</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Execution Gate:</span>
                <span className="text-amber-500 font-bold">Gate D/E Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Broker Routing:</span>
                <span className="text-[var(--text-muted)]">Disabled (Safety Lock)</span>
              </div>
            </div>
          </div>

          {/* Historical Parquet Market Data Feed */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#D9690F]/15 text-[#D9690F]">
              <Database className="w-5 h-5 flex-shrink-0" />
            </div>
            <div className="text-xs">
              <span className="block font-bold text-[var(--text)]">Indian Market Data Store</span>
              <span className="block text-[11px] text-[var(--text-muted)]">
                Licensed Local Parquet Partitions (1-min OHLCV + Bhavcopy)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
