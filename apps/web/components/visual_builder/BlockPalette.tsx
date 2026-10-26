"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Layers,
  Activity,
  GitBranch,
  ShieldAlert,
  Sliders,
  TrendingUp,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  AlertCircle,
  Plus,
  Compass,
  Zap,
} from "lucide-react";
import { PaletteBlockCategory, PaletteBlockItem } from "./types";

interface BlockPaletteProps {
  onAddBlock: (block: PaletteBlockItem) => void;
  activeDirection: "CALL" | "PUT";
}

const PALETTE_BLOCKS: PaletteBlockItem[] = [
  // Strategy Blocks
  {
    id: "block_strategy_header",
    name: "Strategy Header",
    category: "strategy",
    iconName: "Compass",
    badge: "Core",
    description: "Instrument, Exchange (NSE/BSE/MCX), and Base Timeframe.",
    blockType: "strategy_start",
  },
  {
    id: "block_trading_mode",
    name: "Trading Mode",
    category: "strategy",
    iconName: "Clock",
    badge: "Mode",
    description: "Intraday (15:15 IST square-off) vs. BTST (Overnight holding).",
    blockType: "trading_mode",
  },
  {
    id: "block_orb_module",
    name: "Opening Range (ORB)",
    category: "strategy",
    iconName: "Zap",
    badge: "Module",
    description: "Configures 09:15-09:30 range window, first 3m candle, and entry cutoff.",
    blockType: "opening_range",
  },
  {
    id: "block_entry_section",
    name: "Entry Logic Section",
    category: "strategy",
    iconName: "ArrowUpRight",
    badge: "Rules",
    description: "Container for nested CALL and PUT entry condition groups.",
    blockType: "entry_section",
  },
  {
    id: "block_exit_section",
    name: "Exit Logic Section",
    category: "strategy",
    iconName: "ArrowDownRight",
    badge: "Rules",
    description: "Container for CALL/PUT exit conditions, Stop-Loss, and Targets.",
    blockType: "exit_section",
  },
  {
    id: "block_risk_mgmt",
    name: "Risk Management",
    category: "strategy",
    iconName: "ShieldAlert",
    badge: "Safety",
    description: "Position sizing, max open positions, and daily loss circuit.",
    blockType: "risk_management",
  },

  // Market Data Blocks
  {
    id: "data_orb_high",
    name: "Opening Range High",
    category: "market_data",
    iconName: "TrendingUp",
    badge: "ORB",
    description: "Highest price achieved in configured opening range window.",
    blockType: "market_source",
    payload: { price_field: "orb_high" },
  },
  {
    id: "data_orb_low",
    name: "Opening Range Low",
    category: "market_data",
    iconName: "TrendingUp",
    badge: "ORB",
    description: "Lowest price achieved in configured opening range window.",
    blockType: "market_source",
    payload: { price_field: "orb_low" },
  },
  {
    id: "data_orb_midpoint",
    name: "ORB Midpoint",
    category: "market_data",
    iconName: "TrendingUp",
    badge: "Level",
    description: "Calculated midpoint: (ORB High + ORB Low) / 2.0.",
    blockType: "market_source",
    payload: { price_field: "orb_midpoint" },
  },
  {
    id: "data_first_candle_high",
    name: "First ORB Candle High",
    category: "market_data",
    iconName: "TrendingUp",
    badge: "First Bar",
    description: "High of the first configured opening-range candle (e.g. 3m).",
    blockType: "market_source",
    payload: { price_field: "first_orb_candle_high" },
  },
  {
    id: "data_first_candle_low",
    name: "First ORB Candle Low",
    category: "market_data",
    iconName: "TrendingUp",
    badge: "First Bar",
    description: "Low of the first configured opening-range candle (e.g. 3m).",
    blockType: "market_source",
    payload: { price_field: "first_orb_candle_low" },
  },
  {
    id: "data_candle_prev_close",
    name: "Candle [-1] Close",
    category: "market_data",
    iconName: "Clock",
    badge: "Offset -1",
    description: "Close price of the previous completed candlestick bar.",
    blockType: "market_source",
    payload: { price_field: "close", offset: -1 },
  },
  {
    id: "data_candle_two_ago_close",
    name: "Candle [-2] Close",
    category: "market_data",
    iconName: "Clock",
    badge: "Offset -2",
    description: "Close price from two completed candlestick bars ago.",
    blockType: "market_source",
    payload: { price_field: "close", offset: -2 },
  },
  {
    id: "data_candle_current_close",
    name: "Candle [0] Forming Close",
    category: "market_data",
    iconName: "Clock",
    badge: "Offset 0",
    description: "Real-time running close price of current forming bar.",
    blockType: "market_source",
    payload: { price_field: "close", offset: 0 },
  },

  // Indicator Blocks
  {
    id: "ind_ema",
    name: "EMA (Exponential MA)",
    category: "indicators",
    iconName: "Activity",
    badge: "Trend",
    description: "Exponential Moving Average with configurable period (e.g. 9, 21, 50).",
    blockType: "indicator",
    payload: { type: "EMA", period: 9, source: "close" },
  },
  {
    id: "ind_sma",
    name: "SMA (Simple MA)",
    category: "indicators",
    iconName: "Activity",
    badge: "Trend",
    description: "Simple Moving Average over N periods.",
    blockType: "indicator",
    payload: { type: "SMA", period: 20, source: "close" },
  },
  {
    id: "ind_rsi",
    name: "RSI (Relative Strength)",
    category: "indicators",
    iconName: "Activity",
    badge: "Momentum",
    description: "Momentum oscillator (default 14 periods) bounded between 0 and 100.",
    blockType: "indicator",
    payload: { type: "RSI", period: 14, source: "close" },
  },
  {
    id: "ind_vwap",
    name: "VWAP (Volume Weighted)",
    category: "indicators",
    iconName: "Activity",
    badge: "Benchmark",
    description: "Intraday volume-weighted benchmark price starting from 09:15 IST.",
    blockType: "indicator",
    payload: { type: "VWAP", period: 1, source: "typical_price" },
  },
  {
    id: "ind_supertrend",
    name: "Supertrend",
    category: "indicators",
    iconName: "Activity",
    badge: "Filter",
    description: "ATR-based trend-following indicator (Period 10, Multiplier 3.0).",
    blockType: "indicator",
    payload: { type: "SUPERTREND", period: 10, multiplier: 3.0, source: "close" },
  },
  {
    id: "ind_atr",
    name: "ATR (Average True Range)",
    category: "indicators",
    iconName: "Activity",
    badge: "Volatility",
    description: "Volatility metric used for dynamic trailing stops and position sizing.",
    blockType: "indicator",
    payload: { type: "ATR", period: 14, source: "close" },
  },
  {
    id: "ind_bb",
    name: "Bollinger Bands",
    category: "indicators",
    iconName: "Activity",
    badge: "Volatility",
    description: "Volatility envelope with upper, middle, and lower bands.",
    blockType: "indicator",
    payload: { type: "BOLLINGER_BANDS", period: 20, std_dev: 2.0, source: "close" },
  },
  {
    id: "ind_ichimoku",
    name: "Ichimoku Cloud",
    category: "indicators",
    iconName: "Activity",
    badge: "Unavailable",
    description: "Japanese charting cloud system.",
    blockType: "indicator",
    isUnsupported: true,
    unsupportedReason: "Ichimoku calculation runtime is not currently supported in strategy AST.",
  },

  // Logic Blocks
  {
    id: "logic_and_group",
    name: "AND Condition Group",
    category: "logic",
    iconName: "GitBranch",
    badge: "Logic",
    description: "All conditions within this group must evaluate to True.",
    blockType: "and_group",
  },
  {
    id: "logic_or_group",
    name: "OR Condition Group",
    category: "logic",
    iconName: "GitBranch",
    badge: "Logic",
    description: "Any single condition within this group can evaluate to True.",
    blockType: "or_group",
  },
  {
    id: "logic_crosses_above",
    name: "Crosses Above Condition",
    category: "logic",
    iconName: "ArrowUpRight",
    badge: "Breakout",
    description: "Left value was <= right value at -2, and > right value at -1.",
    blockType: "condition",
    payload: { operator: "CROSSES_ABOVE" },
  },
  {
    id: "logic_crosses_below",
    name: "Crosses Below Condition",
    category: "logic",
    iconName: "ArrowDownRight",
    badge: "Breakdown",
    description: "Left value was >= right value at -2, and < right value at -1.",
    blockType: "condition",
    payload: { operator: "CROSSES_BELOW" },
  },
  {
    id: "logic_greater_than",
    name: "Greater Than Condition",
    category: "logic",
    iconName: "Maximize2",
    badge: "Comparison",
    description: "Compares if source value > threshold/reference at specified offset.",
    blockType: "condition",
    payload: { operator: "GREATER_THAN" },
  },
  {
    id: "logic_less_than",
    name: "Less Than Condition",
    category: "logic",
    iconName: "Maximize2",
    badge: "Comparison",
    description: "Compares if source value < threshold/reference at specified offset.",
    blockType: "condition",
    payload: { operator: "LESS_THAN" },
  },

  // Exit and Risk Blocks
  {
    id: "risk_stop_loss",
    name: "Stop-Loss Protection",
    category: "exit_risk",
    iconName: "ShieldAlert",
    badge: "Protection",
    description: "Fixed points, percentage, or ATR-based stop-loss exit threshold.",
    blockType: "stop_loss",
  },
  {
    id: "risk_profit_target",
    name: "Profit Target Leg",
    category: "exit_risk",
    iconName: "Target",
    badge: "Target",
    description: "Single or staged multi-target exits (e.g. 50% at 1R, 50% at 2R).",
    blockType: "profit_target",
  },
  {
    id: "risk_tsl",
    name: "Trailing Stop-Loss (TSL)",
    category: "exit_risk",
    iconName: "TrendingUp",
    badge: "Dynamic",
    description: "Monotonically ratcheting profit trail behind high/low-water mark.",
    blockType: "trailing_stop",
  },
  {
    id: "risk_intraday_squareoff",
    name: "Intraday Square-Off",
    category: "exit_risk",
    iconName: "Clock",
    badge: "15:15 IST",
    description: "Mandatory time-based liquidation enforcing intraday capital safety.",
    blockType: "intraday_squareoff",
  },
  {
    id: "risk_btst_overnight",
    name: "BTST Overnight Holding",
    category: "exit_risk",
    iconName: "Clock",
    badge: "Overnight",
    description: "Next-session 09:15-09:30 exit window with mandatory gap risk check.",
    blockType: "btst_overnight",
  },
];

const CATEGORIES: { id: PaletteBlockCategory; label: string; icon: React.ElementType }[] = [
  { id: "strategy", label: "Strategy", icon: Compass },
  { id: "market_data", label: "Market Data", icon: TrendingUp },
  { id: "indicators", label: "Indicators", icon: Activity },
  { id: "logic", label: "Logic & Rules", icon: GitBranch },
  { id: "exit_risk", label: "Exits & Risk", icon: ShieldAlert },
];

export function BlockPalette({ onAddBlock, activeDirection }: BlockPaletteProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<PaletteBlockCategory | "all">("all");

  const filteredBlocks = useMemo(() => {
    return PALETTE_BLOCKS.filter((block) => {
      const matchesSearch =
        block.name.toLowerCase().includes(search.toLowerCase()) ||
        block.description.toLowerCase().includes(search.toLowerCase()) ||
        (block.badge && block.badge.toLowerCase().includes(search.toLowerCase()));

      const matchesCat = activeCategory === "all" || block.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, activeCategory]);

  function handleDragStart(e: React.DragEvent, block: PaletteBlockItem) {
    if (block.isUnsupported) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/json", JSON.stringify(block));
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <aside className="w-80 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col flex-shrink-0 select-none overflow-hidden transition-colors">
      {/* Palette Header */}
      <div className="p-3.5 border-b border-[var(--border)] space-y-2.5 bg-[var(--surface)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
              Block Palette
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30">
            {activeDirection} Active
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks, indicators, levels..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF7722] transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-all whitespace-nowrap ${
              activeCategory === "all"
                ? "bg-[#FF7722] text-white font-bold"
                : "bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-[#FF7722] text-white font-bold"
                  : "bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Block List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredBlocks.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)]">
            No matching blocks found for "{search}".
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const isUnsup = block.isUnsupported;
            return (
              <div
                key={block.id}
                draggable={!isUnsup}
                onDragStart={(e) => handleDragStart(e, block)}
                className={`p-2.5 rounded-lg border transition-all ${
                  isUnsup
                    ? "opacity-50 border-[var(--border)] bg-[var(--bg)]/40 cursor-not-allowed"
                    : "border-[var(--border)] bg-[var(--bg)] hover:border-[#FF7722]/60 hover:shadow-sm cursor-grab active:cursor-grabbing group"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF7722] flex-shrink-0" />
                    <span className="text-xs font-semibold text-[var(--text)] truncate">
                      {block.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {block.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                          isUnsup
                            ? "bg-red-500/15 text-red-500 border border-red-500/30"
                            : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]"
                        }`}
                      >
                        {block.badge}
                      </span>
                    )}
                    {!isUnsup && (
                      <button
                        type="button"
                        onClick={() => onAddBlock(block)}
                        title="Add to canvas"
                        className="w-5 h-5 rounded flex items-center justify-center bg-[#FF7722]/15 text-[#FF7722] hover:bg-[#FF7722] hover:text-white transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                  {block.description}
                </p>

                {isUnsup && block.unsupportedReason && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-red-400">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{block.unsupportedReason}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Palette Footer Tip */}
      <div className="p-2.5 border-t border-[var(--border)] bg-[var(--bg)]/50 text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
        <Sliders className="w-3.5 h-3.5 text-[#FF7722] flex-shrink-0" />
        <span>Drag blocks or click "+" to insert into active condition group.</span>
      </div>
    </aside>
  );
}
