"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FlaskConical,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Play,
  RotateCw,
} from "lucide-react";
import {
  api,
  StrategyLibraryItem,
  BacktestHistoryItem,
} from "../../lib/api";

interface BacktestHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyLibraryItem;
  workspaceId: string;
  onNavigateBacktestLab?: () => void;
}

export function BacktestHistoryModal({
  isOpen,
  onClose,
  strategy,
  workspaceId,
  onNavigateBacktestLab,
}: BacktestHistoryModalProps) {
  const [backtests, setBacktests] = useState<BacktestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadBacktests();
  }, [isOpen, strategy.id, workspaceId]);

  async function loadBacktests() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStrategyBacktests(workspaceId, strategy.id);
      setBacktests(res.backtests || []);
    } catch (err: any) {
      setError(err.message || "Failed to load backtest history.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text)]">Backtest Simulation History</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF7722]/15 text-[#FF7722]">
                  {strategy.name}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Persisted historical event-driven simulation runs on Indian market tick & bar datasets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadBacktests}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
              title="Refresh runs"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
              <span className="text-xs text-[var(--text-muted)]">Querying simulation run ledger...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && backtests.length === 0 && (
            <div className="py-12 rounded-xl border border-dashed border-[var(--border)] text-center p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mx-auto">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">No Backtests Found</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
                  This strategy has not been queued or evaluated on historical market data yet.
                </p>
              </div>
              {onNavigateBacktestLab && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateBacktestLab();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Launch in Backtest Lab
                </button>
              )}
            </div>
          )}

          {!loading && !error && backtests.length > 0 && (
            <div className="space-y-3">
              {backtests.map((run) => {
                const isCompleted = run.status.toUpperCase() === "COMPLETED";
                const isFailed = run.status.toUpperCase() === "FAILED";
                const isPending = run.status.toUpperCase() === "PENDING" || run.status.toUpperCase() === "QUEUED";
                const isRunning = run.status.toUpperCase() === "RUNNING";
                const metrics = run.metrics;

                const pnl = metrics?.net_pnl_inr ?? 0;
                const winRate = metrics?.win_rate_pct;
                const drawdown = metrics?.max_drawdown_pct;
                const trades = metrics?.trades_count;

                return (
                  <div
                    key={run.job_id}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] space-y-3"
                  >
                    {/* Header line */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--text)]">
                          Job #{run.job_id.slice(0, 8)}
                        </span>
                        {run.version_number && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]">
                            v{run.version_number}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(run.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isCompleted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-500 border border-green-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                        {isRunning && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                            Running
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Queued
                          </span>
                        )}
                        {isFailed && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-500 border border-red-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics grid if completed */}
                    {isCompleted && metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono">
                        <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                          <span className="block text-[10px] text-[var(--text-muted)] font-sans">Net P&L</span>
                          <span
                            className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${
                              pnl >= 0 ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            {pnl >= 0 ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {pnl >= 0 ? "+" : ""}₹{pnl.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                          <span className="block text-[10px] text-[var(--text-muted)] font-sans">Win Rate</span>
                          <span className="text-xs font-bold text-[var(--text)] mt-0.5">
                            {winRate !== undefined ? `${winRate.toFixed(1)}%` : "N/A"}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                          <span className="block text-[10px] text-[var(--text-muted)] font-sans">Max Drawdown</span>
                          <span className="text-xs font-bold text-red-500 mt-0.5">
                            {drawdown !== undefined ? `${drawdown.toFixed(1)}%` : "N/A"}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                          <span className="block text-[10px] text-[var(--text-muted)] font-sans">Total Trades</span>
                          <span className="text-xs font-bold text-[var(--text)] mt-0.5">
                            {trades ?? "N/A"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error display if failed */}
                    {isFailed && run.error_message && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                        Error: {run.error_message}
                      </div>
                    )}

                    {/* Pending state details */}
                    {isPending && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                        Job is registered in execution queue. Awaiting worker dataset allocation.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legal / Risk Disclosure */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[11px] text-[var(--text-muted)] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text)]">
              <ShieldAlert className="w-3.5 h-3.5 text-[#FF7722]" />
              Regulatory & Risk Disclaimer
            </div>
            <p>
              Simulated performance records do not reflect actual live market execution. Real-world returns may diverge significantly due to statutory levies, exchange slippage, order-book depth latency, and unexpected regime changes.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {backtests.length} simulation run(s) logged
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
