"use client";

import React, { useState } from "react";
import {
  StrategyLibraryItem,
  StrategyFolderItem,
} from "../../lib/api";
import {
  Sparkles,
  GitFork,
  Star,
  MoreVertical,
  Copy,
  FolderInput,
  Tag,
  History,
  FlaskConical,
  Archive,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  ExternalLink,
  Edit2,
  Scale,
} from "lucide-react";

interface StrategyCardProps {
  strategy: StrategyLibraryItem;
  folders: StrategyFolderItem[];
  onOpenInAIStudio: (strategy: StrategyLibraryItem) => void;
  onOpenInVisualBuilder: (strategy: StrategyLibraryItem) => void;
  onToggleFavorite: (strategy: StrategyLibraryItem) => void;
  onDuplicate: (strategy: StrategyLibraryItem) => void;
  onRename: (strategy: StrategyLibraryItem) => void;
  onMoveToFolder: (strategy: StrategyLibraryItem) => void;
  onManageTags: (strategy: StrategyLibraryItem) => void;
  onViewVersions: (strategy: StrategyLibraryItem) => void;
  onViewBacktests: (strategy: StrategyLibraryItem) => void;
  onCompare: (strategy: StrategyLibraryItem) => void;
  onArchive: (strategy: StrategyLibraryItem) => void;
  onRestore: (strategy: StrategyLibraryItem) => void;
  onDelete: (strategy: StrategyLibraryItem) => void;
}

export function StrategyCard({
  strategy,
  folders,
  onOpenInAIStudio,
  onOpenInVisualBuilder,
  onToggleFavorite,
  onDuplicate,
  onRename,
  onMoveToFolder,
  onManageTags,
  onViewVersions,
  onViewBacktests,
  onCompare,
  onArchive,
  onRestore,
  onDelete,
}: StrategyCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isArchived = strategy.status === "archived";

  const statusBadgeConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    draft: { label: "Draft", bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
    validated: { label: "Validated", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
    backtested: { label: "Backtested", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
    paper_trading: { label: "Paper Active", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
    archived: { label: "Archived", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  };

  const badge = statusBadgeConfig[strategy.status] || statusBadgeConfig.draft;

  // Format date nicely
  const formattedDate = new Date(strategy.updated_at).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-visible bg-[var(--surface)] hover:border-[#FF7722]/50 hover:shadow-lg hover:shadow-[#FF7722]/5 ${
        isArchived ? "opacity-75 border-dashed border-[var(--border)]" : "border-[var(--border)]"
      }`}
    >
      {/* Top Banner & Quick Controls */}
      <div className="p-4.5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Symbol & Exchange */}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30">
              {strategy.spec.exchange}:{strategy.spec.symbol}
            </span>

            {/* Trading Mode */}
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                strategy.spec.trading_mode === "BTST"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/25"
              }`}
            >
              {strategy.spec.trading_mode || "INTRADAY"}
            </span>

            {/* Category */}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]">
              {strategy.spec.category}
            </span>

            {/* Version Badge */}
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)]">
              v{strategy.version_number}
            </span>
          </div>

          {/* Right Icon Actions: Star & Menu */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleFavorite(strategy)}
              className={`p-1.5 rounded-md transition-colors ${
                strategy.is_favorite
                  ? "text-amber-400 hover:text-amber-300"
                  : "text-[var(--text-muted)] hover:text-amber-400"
              }`}
              title={strategy.is_favorite ? "Remove from Favorites" : "Mark as Favorite"}
            >
              <Star className={`w-4 h-4 ${strategy.is_favorite ? "fill-amber-400" : ""}`} />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
                title="Strategy Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 w-52 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl z-50 py-1.5 text-xs select-none">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenInAIStudio(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)] text-left"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Open in AI Studio</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenInVisualBuilder(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)] text-left"
                    >
                      <GitFork className="w-3.5 h-3.5 text-[#FF7722]" />
                      <span>Open in Visual Builder</span>
                    </button>

                    <div className="my-1 border-t border-[var(--border)]" />

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDuplicate(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)] text-left"
                    >
                      <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Duplicate Strategy</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onRename(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)] text-left"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Rename / Edit Info</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onMoveToFolder(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)] text-left"
                    >
                      <FolderInput className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Move to Folder</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onManageTags(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)] text-left"
                    >
                      <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Edit Tags</span>
                    </button>

                    <div className="my-1 border-t border-[var(--border)]" />

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onViewVersions(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)] text-left"
                    >
                      <History className="w-3.5 h-3.5 text-blue-400" />
                      <span>Version History ({strategy.versions_count})</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onViewBacktests(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)] text-left"
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
                      <span>Backtest History</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onCompare(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-[var(--text)] text-left"
                    >
                      <Scale className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Compare Strategy</span>
                    </button>

                    <div className="my-1 border-t border-[var(--border)]" />

                    {!isArchived ? (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onArchive(strategy);
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-amber-400 text-left"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive Strategy</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onRestore(strategy);
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[var(--bg)] text-emerald-400 text-left"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Strategy</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(strategy);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-500/15 text-rose-400 text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Strategy</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Strategy Title & Description */}
        <h3
          onClick={() => onOpenInVisualBuilder(strategy)}
          className="text-sm font-bold text-[var(--text)] hover:text-[#FF7722] cursor-pointer transition-colors line-clamp-1 mb-1"
          title={strategy.name}
        >
          {strategy.name}
        </h3>

        <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-3">
          {strategy.description || "No description provided."}
        </p>

        {/* Timeframe & Structure Details */}
        <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[11px] mb-3">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block">Timeframe</span>
            <span className="font-mono font-semibold text-[var(--text)]">
              {strategy.spec.timeframe} ({strategy.spec.entry_timeframe || strategy.spec.timeframe})
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[var(--text-muted)] block">Indicators</span>
            <span className="font-mono font-semibold text-[var(--text)]">
              {strategy.spec.indicators_count} configured
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[var(--text-muted)] block">Trailing SL</span>
            <span
              className={`font-mono font-semibold ${
                strategy.spec.has_tsl ? "text-emerald-400" : "text-[var(--text-muted)]"
              }`}
            >
              {strategy.spec.has_tsl ? "Active" : "None"}
            </span>
          </div>
        </div>

        {/* Tags & Folder info */}
        <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
          {strategy.folder_name && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25">
              <FolderInput className="w-2.5 h-2.5" />
              {strategy.folder_name}
            </span>
          )}

          {strategy.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 rounded text-[10px] text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)]"
            >
              #{tag}
            </span>
          ))}

          {strategy.tags.length > 3 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              +{strategy.tags.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Backtest & Real Performance Pill (if completed) */}
      <div className="px-4.5 py-2.5 bg-[var(--bg)]/50 border-t border-[var(--border)] flex items-center justify-between text-xs">
        {strategy.last_backtest && strategy.last_backtest.status === "COMPLETED" && strategy.last_backtest.metrics ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Backtest</span>
              <span
                className={`font-mono font-bold text-xs ${
                  (strategy.last_backtest.metrics.net_pnl_inr || 0) >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {(strategy.last_backtest.metrics.net_pnl_inr || 0) >= 0 ? "+" : ""}
                ₹{(strategy.last_backtest.metrics.net_pnl_inr || 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
              <span>{strategy.last_backtest.metrics.win_rate_pct || 0}% WR</span>
              <span>•</span>
              <span>{strategy.last_backtest.metrics.trades_count || 0} trades</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[var(--text-muted)]" />
              {strategy.last_backtest
                ? `Backtest: ${strategy.last_backtest.status}`
                : "No backtest executed"}
            </span>

            {/* Validation summary indicator */}
            <div className="flex items-center gap-1 text-[11px]">
              {strategy.validation.is_valid ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                  <CheckCircle2 className="w-3 h-3" /> Valid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-400 font-mono text-[10px]">
                  <AlertTriangle className="w-3 h-3" /> {strategy.validation.error_count} Errors
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Status & Quick Launch CTA */}
      <div className="p-3 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {badge.label}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">{formattedDate}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenInAIStudio(strategy)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-all flex items-center gap-1"
            title="Open in AI Strategy Studio"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI</span>
          </button>

          <button
            onClick={() => onOpenInVisualBuilder(strategy)}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#FF7722] hover:bg-[#FF7722]/90 text-white shadow-sm transition-all flex items-center gap-1"
            title="Open in Visual Strategy Builder"
          >
            <GitFork className="w-3 h-3" />
            <span>Builder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
