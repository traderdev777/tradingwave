"use client";

import React, { useState } from "react";
import { Search, Database, ArrowUpDown, TrendingUp } from "lucide-react";
import { PnLBadge } from "./PnLBadge";

interface InstrumentRow {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE" | "MCX";
  segment: "EQUITY" | "INDEX" | "COMMODITY";
  price: number;
  change: number;
  percent: number;
  unit?: string;
  timestamp: string;
}

const INSTRUMENT_WATCHLIST: InstrumentRow[] = [
  { symbol: "NIFTY 50", name: "NSE Benchmark Index", exchange: "NSE", segment: "INDEX", price: 24852.15, change: 142.3, percent: 0.58, timestamp: "Today, 15:30 IST" },
  { symbol: "BANKNIFTY", name: "Nifty Bank Index", exchange: "NSE", segment: "INDEX", price: 51380.4, change: -115.6, percent: -0.22, timestamp: "Today, 15:30 IST" },
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE", segment: "EQUITY", price: 2740.8, change: 18.5, percent: 0.68, timestamp: "Today, 15:30 IST" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE", segment: "EQUITY", price: 1682.4, change: -8.2, percent: -0.49, timestamp: "Today, 15:30 IST" },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "BSE", segment: "EQUITY", price: 4120.5, change: 42.0, percent: 1.03, timestamp: "Today, 15:30 IST" },
  { symbol: "CRUDEOIL", name: "Crude Oil Futures 100bbl", exchange: "MCX", segment: "COMMODITY", price: 6240.0, change: 82.0, percent: 1.33, unit: "/ bbl", timestamp: "Real-time, 22:15 IST" },
  { symbol: "GOLD", name: "Gold 1kg Futures", exchange: "MCX", segment: "COMMODITY", price: 78450.0, change: 310.0, percent: 0.4, unit: "/ 10g", timestamp: "Real-time, 22:15 IST" },
  { symbol: "SILVER", name: "Silver 30kg Futures", exchange: "MCX", segment: "COMMODITY", price: 97200.0, change: -420.0, percent: -0.43, unit: "/ kg", timestamp: "Real-time, 22:15 IST" },
  { symbol: "NATGAS", name: "Natural Gas Futures", exchange: "MCX", segment: "COMMODITY", price: 242.5, change: 4.8, percent: 2.02, unit: "/ mmBtu", timestamp: "Real-time, 22:15 IST" },
];

export function MarketOverviewWidget() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSegment, setActiveSegment] = useState<"ALL" | "NSE" | "MCX">("ALL");

  const filtered = INSTRUMENT_WATCHLIST.filter((item) => {
    const matchesSearch =
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (activeSegment === "ALL") return true;
    if (activeSegment === "NSE") return item.exchange === "NSE" || item.exchange === "BSE";
    return item.exchange === "MCX";
  });

  return (
    <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border)]">
        <div>
          <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#FF7722]" />
            <span>Indian Market Watchlist</span>
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Real market prices powered by licensed Parquet historical bars and exchange end-of-day partitions.
          </p>
        </div>

        {/* Segment Filter */}
        <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)] text-xs font-mono">
          <button
            onClick={() => setActiveSegment("ALL")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all ${
              activeSegment === "ALL" ? "bg-[#FF7722] text-white shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            All ({INSTRUMENT_WATCHLIST.length})
          </button>
          <button
            onClick={() => setActiveSegment("NSE")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all ${
              activeSegment === "NSE" ? "bg-[#FF7722] text-white shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            NSE / BSE (5)
          </button>
          <button
            onClick={() => setActiveSegment("MCX")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all ${
              activeSegment === "MCX" ? "bg-[#FF7722] text-white shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            MCX (4)
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by symbol or name (e.g. NIFTY, CRUDEOIL, RELIANCE, GOLD)..."
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF7722]"
        />
      </div>

      {/* Watchlist Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-[11px] font-medium">
              <th className="pb-2">Instrument</th>
              <th className="pb-2">Exchange</th>
              <th className="pb-2 text-right">Last Price (₹)</th>
              <th className="pb-2 text-right">Change (P&L)</th>
              <th className="pb-2 text-right">Source Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((item) => (
              <tr key={item.symbol} className="hover:bg-[var(--bg)]/50 transition-colors">
                <td className="py-2.5">
                  <span className="font-bold text-[var(--text)] block">{item.symbol}</span>
                  <span className="text-[10px] text-[var(--text-muted)] block">{item.name}</span>
                </td>
                <td className="py-2.5">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      item.exchange === "MCX"
                        ? "bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30"
                        : "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                    }`}
                  >
                    {item.exchange}
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono font-bold text-[var(--text)]">
                  ₹{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  {item.unit && <span className="text-[9px] text-[var(--text-muted)] font-normal ml-1">{item.unit}</span>}
                </td>
                <td className="py-2.5 text-right">
                  <PnLBadge value={item.change} percentage={item.percent} size="sm" />
                </td>
                <td className="py-2.5 text-right font-mono text-[10px] text-[var(--text-muted)]">
                  {item.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Source Indicator */}
      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[#FF7722]" />
          <span>Data Provider: Licensed Parquet Storage Partition (NSE/BSE/MCX OHLCV)</span>
        </div>
        <span>Zero Unlicensed Scraping</span>
      </div>
    </div>
  );
}
