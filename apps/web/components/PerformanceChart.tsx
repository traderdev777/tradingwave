"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries } from "lightweight-charts";
import { EquityPoint } from "../lib/api";
import { TrendingUp, Layers, Calendar, Info } from "lucide-react";

interface PerformanceChartProps {
  data: EquityPoint[];
  isDarkTheme: boolean;
  selectedKey: string;
  onSelectKey: (key: string) => void;
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
  onNavigateTab: (tabId: string) => void;
}

const DATA_TARGETS = [
  { id: "paper_portfolio", label: "Paper Portfolio (Simulated Composite)" },
  { id: "mcx_crude", label: "MCX Crude Oil 30m Breakout" },
  { id: "nifty_supertrend", label: "NIFTY 15m Supertrend VWAP Breakout" },
];

const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y", "All"];

export function PerformanceChart({
  data,
  isDarkTheme,
  selectedKey,
  onSelectKey,
  selectedPeriod,
  onSelectPeriod,
  onNavigateTab,
}: PerformanceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const [hoveredPoint, setHoveredPoint] = useState<{
    time: string;
    value: number;
    pnl: number;
  } | null>(null);

  const latestPoint = data.length > 0 ? data[data.length - 1] : null;
  const initialPoint = data.length > 0 ? data[0] : null;
  const netPnl = latestPoint && initialPoint ? latestPoint.value - initialPoint.value : 0;
  const pnlPercent = initialPoint && initialPoint.value > 0 ? (netPnl / initialPoint.value) * 100 : 0;

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Destroy existing chart if present
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isDark = isDarkTheme;
    const bg = isDark ? "#12141C" : "#FFFFFF";
    const textColor = isDark ? "#A9B0C0" : "#5B6475";
    const gridColor = isDark ? "rgba(44, 50, 66, 0.4)" : "rgba(232, 223, 208, 0.5)";

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: textColor,
        fontFamily: "inherit",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        vertLine: {
          color: "#D9690F",
          width: 1,
          style: 3,
          labelBackgroundColor: "#D9690F",
        },
        horzLine: {
          color: "#D9690F",
          width: 1,
          style: 3,
          labelBackgroundColor: "#D9690F",
        },
      },
      rightPriceScale: {
        borderColor: gridColor,
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: false,
      },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: "rgba(217, 105, 15, 0.35)",
      bottomColor: "rgba(217, 105, 15, 0.02)",
      lineColor: "#D9690F",
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.05,
      },
    });

    const formattedData = data.map((d) => ({
      time: d.time,
      value: d.value,
    }));

    areaSeries.setData(formattedData);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    // Crosshair move subscription for hover feedback
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData.get(areaSeries)) {
        setHoveredPoint(null);
        return;
      }
      const val = (param.seriesData.get(areaSeries) as any)?.value;
      if (typeof val === "number") {
        const timeStr = typeof param.time === "string" ? param.time : "";
        const baseVal = initialPoint ? initialPoint.value : 100000;
        setHoveredPoint({
          time: timeStr,
          value: val,
          pnl: val - baseVal,
        });
      }
    });

    // Handle responsive container resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data, isDarkTheme]);

  if (data.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
          <TrendingUp className="w-6 h-6 text-[#D9690F]" />
        </div>
        <h3 className="text-base font-bold text-[var(--text)]">No Performance Data Yet</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
          Run an event-driven backtest or launch a virtual paper-trading session to generate verifiable equity curves.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigateTab("backtest_lab")}
            className="px-4 py-2 rounded-lg bg-[#D9690F] hover:bg-[#C25E08] text-white text-xs font-bold shadow-sm transition-all"
          >
            Run Backtest
          </button>
          <button
            onClick={() => onNavigateTab("paper_trading")}
            className="px-4 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)]/30 text-[var(--text)] text-xs font-semibold border border-[var(--border)] transition-all"
          >
            Start Paper Trading
          </button>
        </div>
      </div>
    );
  }

  const currentDisplay = hoveredPoint || {
    time: latestPoint?.time || "",
    value: latestPoint?.value || 0,
    pnl: netPnl,
  };
  const isProfit = currentDisplay.pnl >= 0;

  return (
    <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
      {/* Chart Header with Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-[var(--text)] tracking-tight">
              Performance Overview
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#D9690F]/15 text-[#D9690F] border border-[#D9690F]/30 uppercase">
              TradingView Canvas
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Equity curve progression derived strictly from stored simulated executions & backtest checkpoints.
          </p>
        </div>

        {/* Dataset Selector & Period Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Target Dropdown */}
          <div className="flex items-center gap-1.5 bg-[var(--bg)] px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs">
            <Layers className="w-3.5 h-3.5 text-[#D9690F]" />
            <select
              value={selectedKey}
              onChange={(e) => onSelectKey(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[var(--text)] focus:outline-none cursor-pointer"
            >
              {DATA_TARGETS.map((t) => (
                <option key={t.id} value={t.id} className="bg-[var(--surface)] text-[var(--text)]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period Tabs */}
          <div className="flex items-center bg-[var(--bg)] p-0.5 rounded-lg border border-[var(--border)] text-xs font-mono">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => onSelectPeriod(p)}
                className={`px-2 py-1 text-[11px] font-bold rounded transition-all ${
                  selectedPeriod === p
                    ? "bg-[#D9690F] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Cursor Info Readout */}
      <div className="flex flex-wrap items-baseline gap-4 pt-1">
        <div>
          <span className="block text-[10px] uppercase font-mono text-[var(--text-muted)]">
            {hoveredPoint ? `Portfolio Value (${hoveredPoint.time})` : "Current Virtual Portfolio Value"}
          </span>
          <span className="text-2xl font-black font-mono text-[var(--text)] tracking-tight">
            ₹{currentDisplay.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className={`font-mono text-sm font-bold flex items-center gap-1 ${
              isProfit ? "text-[var(--profit)]" : "text-[var(--loss)]"
            }`}
          >
            <span>{isProfit ? "+" : "−"}₹{Math.abs(currentDisplay.pnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            <span>({isProfit ? "+" : "−"}{Math.abs(pnlPercent).toFixed(2)}%)</span>
            <span>{isProfit ? "↑" : "↓"}</span>
          </span>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Base: ₹1,00,000.00
          </span>
        </div>
      </div>

      {/* TradingView Lightweight Charts DOM Mount */}
      <div ref={chartContainerRef} className="w-full relative rounded-xl overflow-hidden" />

      {/* Footer Info Notice */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)] font-mono">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#D9690F]" />
          <span>Currency: INR (₹) • Execution Model: Event-Driven Simulation • STT & Slippage Included</span>
        </div>
        <span>Timeframe: Daily Equity Mark</span>
      </div>
    </div>
  );
}
