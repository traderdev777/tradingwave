"use client";

import React, { useState } from "react";
import { StrategyLibraryItem } from "../../lib/api";
import {
  Star,
  Sparkles,
  GitFork,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  FolderInput,
  History,
  FlaskConical,
  Copy,
  Trash2,
  Scale,
} from "lucide-react";

interface StrategyTableViewProps {
  strategies: StrategyLibraryItem[];
  onOpenInAIStudio: (strategy: StrategyLibraryItem) => void;
  onOpenInVisualBuilder: (strategy: StrategyLibraryItem) => void;
  onToggleFavorite: (strategy: StrategyLibraryItem) => void;
  onDuplicate: (strategy: StrategyLibraryItem) => void;
  onViewVersions: (strategy: StrategyLibraryItem) => void;
  onViewBacktests: (strategy: StrategyLibraryItem) => void;
  onCompare: (strategy: StrategyLibraryItem) => void;
  onDelete: (strategy: StrategyLibraryItem) => void;
}

export function StrategyTableView({
  strategies,
  onOpenInAIStudio,
  onOpenInVisualBuilder,
  onToggleFavorite,
  onDuplicate,
  onViewVersions,
  onViewBacktests,
  onCompare,
  onDelete,
}: StrategyTableViewProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (strategies.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)] rounded-xl border border-[var(--border)]">
        No strategies found matching current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full text-left border-collapse text-xs select-none">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg)]/80 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <th className="py-2.5 px-3 w-8 text-center">Fav</th>
            <th className="py-2.5 px-3">Strategy Name</th>
            <th className="py-2.5 px-3">Instrument</th>
            <th className="py-2.5 px-3">Category</th>
            <th className="py-2.5 px-3">Timeframe</th>
            <th className="py-2.5 px-3">Mode</th>
            <th className="py-2.5 px-3">Status</th>
            <th className="py-2.5 px-3">Version</th>
            <th className="py-2.5 px-3">Backtest P&L</th>
            <th className="py-2.5 px-3">Validation</th>
            <th className="py-2.5 px-3">Last Modified</th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] font-sans">
          {strategies.map((strategy) => {
            const formattedDate = new Date(strategy.updated_at).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            });

            return (
              <tr
                key={strategy.id}
                className="hover:bg-[var(--bg)]/50 transition-colors group"
              >
                {/* Favorite */}
                <td className="py-2.5 px-3 text-center">
                  <button
                    onClick={() => onToggleFavorite(strategy)}
                    className="text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        strategy.is_favorite ? "fill-amber-400 text-amber-400" : ""
                      }`}
                    />
                  </button>
                </td>

                {/* Name & Folder */}
                <td className="py-2.5 px-3 max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      onClick={() => onOpenInVisualBuilder(strategy)}
                      className="font-semibold text-[var(--text)] hover:text-[#FF7722] cursor-pointer truncate"
                      title={strategy.name}
                    >
                      {strategy.name}
                    </span>
                    {strategy.folder_name && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                        {strategy.folder_name}
                      </span>
                    )}
                  </div>
                </td>

                {/* Instrument */}
                <td className="py-2.5 px-3">
                  <span className="font-mono font-bold text-[11px] text-[#FF7722]">
                    {strategy.spec.exchange}:{strategy.spec.symbol}
                  </span>
                </td>

                {/* Category */}
                <td className="py-2.5 px-3 text-[var(--text-muted)]">
                  {strategy.spec.category}
                </td>

                {/* Timeframe */}
                <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text)]">
                  {strategy.spec.timeframe}
                </td>

                {/* Mode */}
                <td className="py-2.5 px-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${
                      strategy.spec.trading_mode === "BTST"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    }`}
                  >
                    {strategy.spec.trading_mode || "INTRADAY"}
                  </span>
                </td>

                {/* Status */}
                <td className="py-2.5 px-3">
                  <span className="capitalize text-[11px] text-[var(--text)]">
                    {strategy.status.replace("_", " ")}
                  </span>
                </td>

                {/* Version */}
                <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                  v{strategy.version_number}
                </td>

                {/* Backtest P&L */}
                <td className="py-2.5 px-3 font-mono text-[11px]">
                  {strategy.last_backtest && strategy.last_backtest.metrics ? (
                    <span
                      className={
                        (strategy.last_backtest.metrics.net_pnl_inr || 0) >= 0
                          ? "text-emerald-400 font-bold"
                          : "text-rose-400 font-bold"
                      }
                    >
                      {(strategy.last_backtest.metrics.net_pnl_inr || 0) >= 0 ? "+" : ""}
                      ₹{(strategy.last_backtest.metrics.net_pnl_inr || 0).toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)] text-[10px]">—</span>
                  )}
                </td>

                {/* Validation */}
                <td className="py-2.5 px-3">
                  {strategy.validation.is_valid ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-400 font-mono text-[10px]">
                      <AlertTriangle className="w-3 h-3" /> {strategy.validation.error_count} Err
                    </span>
                  )}
                </td>

                {/* Date */}
                <td className="py-2.5 px-3 text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                  {formattedDate}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onOpenInAIStudio(strategy)}
                      className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/25 transition-colors"
                      title="Open in AI Studio"
                    >
                      <Sparkles className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => onOpenInVisualBuilder(strategy)}
                      className="p-1 rounded bg-[#FF7722]/15 hover:bg-[#FF7722]/25 text-[#FF7722] border border-[#FF7722]/30 transition-colors"
                      title="Open in Visual Builder"
                    >
                      <GitFork className="w-3 h-3" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === strategy.id ? null : strategy.id)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>

                      {activeMenuId === strategy.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                          <div className="absolute right-0 top-6 w-44 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-xl z-50 py-1 text-xs select-none text-left">
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDuplicate(strategy);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)]"
                            >
                              <Copy className="w-3 h-3" /> Duplicate
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onViewVersions(strategy);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-blue-400"
                            >
                              <History className="w-3 h-3" /> Versions ({strategy.versions_count})
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onViewBacktests(strategy);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-purple-400"
                            >
                              <FlaskConical className="w-3 h-3" /> Backtest Runs
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onCompare(strategy);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-emerald-400"
                            >
                              <Scale className="w-3 h-3" /> Compare
                            </button>
                            <div className="my-1 border-t border-[var(--border)]" />
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDelete(strategy);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 hover:bg-rose-500/15 text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
