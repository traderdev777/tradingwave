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
  Flame,
  Coins,
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
  exchange: "NSE" | "BSE" | "MCX";
  price: number;
  change: number;
  percent: number;
  unit?: string;
}

const NSE_BENCHMARKS: IndexQuote[] = [
  { symbol: "NIFTY 50", name: "NSE Nifty 50", exchange: "NSE", price: 24852.15, change: 142.3, percent: 0.58 },
  { symbol: "BANKNIFTY", name: "NSE Nifty Bank", exchange: "NSE", price: 51380.4, change: -115.6, percent: -0.22 },
  { symbol: "FINNIFTY", name: "Nifty Financial", exchange: "NSE", price: 23940.75, change: 68.2, percent: 0.29 },
  { symbol: "SENSEX", name: "BSE Sensex 30", exchange: "BSE", price: 81224.75, change: 480.1, percent: 0.59 },
  { symbol: "INDIA VIX", name: "Volatility Index", exchange: "NSE", price: 12.35, change: -0.45, percent: -3.52 },
];

const MCX_COMMODITIES: IndexQuote[] = [
  { symbol: "CRUDEOIL", name: "MCX Crude Oil", exchange: "MCX", price: 6240.0, change: 82.0, percent: 1.33, unit: "/ bbl" },
  { symbol: "GOLD", name: "MCX Gold (1kg)", exchange: "MCX", price: 78450.0, change: 310.0, percent: 0.4, unit: "/ 10g" },
  { symbol: "SILVER", name: "MCX Silver (30kg)", exchange: "MCX", price: 97200.0, change: -420.0, percent: -0.43, unit: "/ kg" },
  { symbol: "NATGAS", name: "MCX Natural Gas", exchange: "MCX", price: 242.5, change: 4.8, percent: 2.02, unit: "/ mmBtu" },
  { symbol: "COPPER", name: "MCX Copper", exchange: "MCX", price: 842.1, change: 6.5, percent: 0.78, unit: "/ kg" },
];

export function DashboardView({
  summary,
  loading,
  onNavigateTab,
  onOpenAuth,
}: DashboardViewProps) {
  const [istTime, setIstTime] = useState("");
  const [nseStatus, setNseStatus] = useState<"LIVE" | "CLOSED" | "PRE_OPEN">("CLOSED");
  const [mcxStatus, setMcxStatus] = useState<"LIVE" | "CLOSED">("CLOSED");
  const [selectedMarketTab, setSelectedMarketTab] = useState<"ALL" | "NSE" | "MCX">("ALL");
  const [strategyFilter, setStrategyFilter] = useState<"ALL" | "NSE" | "MCX">("ALL");

  // Keep live IST clock synchronized and calculate NSE/BSE vs MCX session status
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

      const day = now.getDay();
      const isWeekday = day >= 1 && day <= 5;

      // 1. NSE/BSE Hours: Pre-open 09:00-09:15, Live 09:15-15:30 IST
      if (isWeekday && totalMinutes >= 9 * 60 && totalMinutes < 9 * 60 + 15) {
        setNseStatus("PRE_OPEN");
      } else if (isWeekday && totalMinutes >= 9 * 60 + 15 && totalMinutes < 15 * 60 + 30) {
        setNseStatus("LIVE");
      } else {
        setNseStatus("CLOSED");
      }

      // 2. MCX Commodity Hours: 09:00 to 23:30 IST (extended evening trading for bullion/energy)
      if (isWeekday && totalMinutes >= 9 * 60 && totalMinutes < 23 * 60 + 30) {
        setMcxStatus("LIVE");
      } else {
        setMcxStatus("CLOSED");
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
          <span className="font-mono text-xs tracking-wider">SYNCING QUANT DESK (NSE • BSE • MCX)...</span>
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
  const paperSessions = summary.paper_sessions || [];

  // Filter strategies by exchange
  const filteredStrategies = strategies.filter((s) => {
    if (strategyFilter === "ALL") return true;
    if (strategyFilter === "MCX") return s.name.toUpperCase().includes("MCX") || (s.description && s.description.toUpperCase().includes("MCX"));
    return !s.name.toUpperCase().includes("MCX");
  });

  // Display benchmarks based on market tab
  const displayQuotes =
    selectedMarketTab === "ALL"
      ? [NSE_BENCHMARKS[0], NSE_BENCHMARKS[1], MCX_COMMODITIES[0], MCX_COMMODITIES[1], MCX_COMMODITIES[3]]
      : selectedMarketTab === "NSE"
      ? NSE_BENCHMARKS
      : MCX_COMMODITIES;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
      {/* 1. Real-time Multi-Exchange Bar (NSE / BSE + MCX) */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Dual Exchange Status Clocks */}
          <div className="flex flex-wrap items-center gap-4 border-b lg:border-b-0 lg:border-r border-[var(--border)] pb-3 lg:pb-0 lg:pr-5">
            {/* NSE / BSE Status */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  nseStatus === "LIVE"
                    ? "bg-emerald-500 animate-pulse"
                    : nseStatus === "PRE_OPEN"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              <span className="text-xs font-bold text-[var(--text)]">
                NSE/BSE: <span className="font-mono text-[11px] font-semibold">{nseStatus}</span>
              </span>
            </div>

            {/* MCX Commodity Status */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  mcxStatus === "LIVE"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              <span className="text-xs font-bold text-[var(--text)]">
                MCX COMMODITIES: <span className="font-mono text-[11px] font-semibold text-[#D9690F]">{mcxStatus}</span>
              </span>
            </div>

            {/* Live Asia/Kolkata Clock */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] bg-[var(--bg)] px-2.5 py-1 rounded-md border border-[var(--border)]">
              <Clock className="w-3.5 h-3.5 text-[#D9690F]" />
              <span>{istTime || "22:15:00"} IST</span>
            </div>
          </div>

          {/* Market Tab Switcher */}
          <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)]">
            <button
              onClick={() => setSelectedMarketTab("ALL")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all ${
                selectedMarketTab === "ALL"
                  ? "bg-[#D9690F] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              All Tickers
            </button>
            <button
              onClick={() => setSelectedMarketTab("NSE")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all ${
                selectedMarketTab === "NSE"
                  ? "bg-[#D9690F] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              NSE / BSE
            </button>
            <button
              onClick={() => setSelectedMarketTab("MCX")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all ${
                selectedMarketTab === "MCX"
                  ? "bg-[#D9690F] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              MCX Commodities
            </button>
          </div>
        </div>

        {/* Ticker Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
          {displayQuotes.map((idx) => (
            <div
              key={idx.symbol}
              className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[var(--text)]">{idx.symbol}</span>
                  <span
                    className={`text-[9px] font-mono px-1 rounded font-semibold ${
                      idx.exchange === "MCX"
                        ? "bg-[#D9690F]/15 text-[#D9690F]"
                        : "bg-blue-500/15 text-blue-500"
                    }`}
                  >
                    {idx.exchange}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  ₹{idx.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  {idx.unit ? <span className="opacity-70 text-[9px]">{idx.unit}</span> : ""}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-end">
                <PnLBadge value={idx.change} percentage={idx.percent} size="sm" />
              </div>
            </div>
          ))}
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
              <span>NSE • BSE • MCX Ready</span>
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
              SEBI Retail Algo Gated
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Multi-asset quantitative repository for{" "}
            <span className="text-[#D9690F] font-bold">{summary.workspace_name}</span>. Covering Indian equities, index derivatives, and MCX commodity futures.
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
              NSE, BSE & MCX AST specifications
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
                Avg Sharpe 2.19
              </span>
            </div>
            <span className="block text-[11px] text-[var(--text-muted)] mt-1">
              Deterministic simulation runs
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
              Cross-exchange pre-trade stop
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#D9690F]" />
                  <span>Workspace Strategies ({filteredStrategies.length})</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Deterministic strategy specifications for NSE, BSE, and MCX markets.
                </p>
              </div>

              {/* Strategy Exchange Filters */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[var(--bg)] p-0.5 rounded-lg border border-[var(--border)]">
                  <button
                    onClick={() => setStrategyFilter("ALL")}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                      strategyFilter === "ALL" ? "bg-[#D9690F] text-white" : "text-[var(--text-muted)]"
                    }`}
                  >
                    All ({strategies.length})
                  </button>
                  <button
                    onClick={() => setStrategyFilter("NSE")}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                      strategyFilter === "NSE" ? "bg-[#D9690F] text-white" : "text-[var(--text-muted)]"
                    }`}
                  >
                    NSE (3)
                  </button>
                  <button
                    onClick={() => setStrategyFilter("MCX")}
                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                      strategyFilter === "MCX" ? "bg-[#D9690F] text-white" : "text-[var(--text-muted)]"
                    }`}
                  >
                    MCX (2)
                  </button>
                </div>

                <button
                  onClick={() => onNavigateTab("visual_builder")}
                  className="text-xs text-[#D9690F] hover:opacity-85 flex items-center gap-1 font-bold whitespace-nowrap"
                >
                  <span>+ Build</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredStrategies.map((strat) => {
                const isMCX = strat.name.toUpperCase().includes("MCX") || (strat.description && strat.description.toUpperCase().includes("MCX"));
                return (
                  <div
                    key={strat.id}
                    className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[#D9690F]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[var(--text)]">{strat.name}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            isMCX
                              ? "bg-[#D9690F]/20 text-[#D9690F] border border-[#D9690F]/30"
                              : "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                          }`}
                        >
                          {isMCX ? "MCX COMMODITY" : "NSE EQUITIES"}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                            strat.status === "published"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-500/15 text-slate-500 border border-slate-500/30"
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
                );
              })}
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
                  Deterministic execution results across NSE equities & MCX commodity contracts.
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
                    <th className="pb-2 font-medium">Strategy & Market</th>
                    <th className="pb-2 font-medium">CAGR %</th>
                    <th className="pb-2 font-medium">Max Drawdown</th>
                    <th className="pb-2 font-medium">Sharpe</th>
                    <th className="pb-2 font-medium">Trades</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {backtests.map((b) => {
                    const isMCX = b.strategy_name.toUpperCase().includes("MCX") || b.strategy_name.toUpperCase().includes("CRUDE") || b.strategy_name.toUpperCase().includes("GOLD");
                    return (
                      <tr key={b.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                        <td className="py-3 font-semibold text-[var(--text)]">
                          <div className="flex items-center gap-1.5">
                            <span>{b.strategy_name}</span>
                            <span
                              className={`text-[9px] font-mono px-1 rounded font-semibold ${
                                isMCX ? "bg-[#D9690F]/15 text-[#D9690F]" : "bg-blue-500/15 text-blue-500"
                              }`}
                            >
                              {isMCX ? "MCX" : "NSE"}
                            </span>
                          </div>
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
                    );
                  })}
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
                <span className="text-[var(--text-muted)]">Auto Square-Off Controls</span>
                <span className="font-mono font-bold text-[#D9690F]">
                  15:15 (NSE) • 23:15 (MCX)
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
                <span className="text-[var(--text-muted)]">Exchanges:</span>
                <span className="text-[var(--text)] font-semibold">NSE • BSE • MCX</span>
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

          {/* Historical Parquet Market Data Feed (NSE, BSE, MCX) */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#D9690F]/15 text-[#D9690F]">
              <Database className="w-5 h-5 flex-shrink-0" />
            </div>
            <div className="text-xs">
              <span className="block font-bold text-[var(--text)]">Multi-Market Data Store</span>
              <span className="block text-[11px] text-[var(--text-muted)]">
                Licensed Local Parquet Partitions (NSE, BSE Equities & MCX Commodities)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
