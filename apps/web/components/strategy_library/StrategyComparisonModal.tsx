"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  GitCompare,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  api,
  StrategyComparisonData,
} from "../../lib/api";

interface StrategyComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  baseStrategyId: string;
  baseVersionId?: string;
  targetStrategyId: string;
  targetVersionId?: string;
}

export function StrategyComparisonModal({
  isOpen,
  onClose,
  workspaceId,
  baseStrategyId,
  baseVersionId,
  targetStrategyId,
  targetVersionId,
}: StrategyComparisonModalProps) {
  const [data, setData] = useState<StrategyComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadComparison();
  }, [isOpen, workspaceId, baseStrategyId, baseVersionId, targetStrategyId, targetVersionId]);

  async function loadComparison() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.compareStrategies(workspaceId, {
        strategy_id_1: baseStrategyId,
        version_id_1: baseVersionId || null,
        strategy_id_2: targetStrategyId,
        version_id_2: targetVersionId || null,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to compare strategies.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const item1 = data?.item_1;
  const item2 = data?.item_2;
  const diffs = data?.differences;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text)]">Strategy Specification Comparison</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Side-by-side structural AST differential across parameters, condition trees, and backtests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-6 h-6 rounded-full border-2 border-[#FF7722] border-t-transparent animate-spin" />
              <span className="text-xs text-[var(--text-muted)]">Evaluating canonical specification diff...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-500">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && item1 && item2 && (
            <>
              {/* Top Side-by-Side Summary Headers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Base Specification
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF7722]/15 text-[#FF7722]">
                      v{item1.version_number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text)]">{item1.name}</h3>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1 truncate">
                    Hash: {item1.specification_hash ? item1.specification_hash.slice(0, 16) + "..." : "pending"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Target Specification
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-500">
                      v{item2.version_number}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text)]">{item2.name}</h3>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1 truncate">
                    Hash: {item2.specification_hash ? item2.specification_hash.slice(0, 16) + "..." : "pending"}
                  </div>
                </div>
              </div>

              {/* Differences Highlights */}
              <div className="p-3.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] space-y-2">
                <div className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#FF7722]" />
                  Structural Diff Summary
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  <DiffBadge label="Symbol" changed={diffs?.symbol_diff} />
                  <DiffBadge label="Timeframe" changed={diffs?.timeframe_diff} />
                  <DiffBadge label="Indicators" changed={diffs?.indicators_diff} />
                  <DiffBadge label="Exit Rules" changed={diffs?.exit_rules_diff} />
                  <DiffBadge label="TSL Settings" changed={diffs?.tsl_diff} />
                  <DiffBadge label="Risk Limits" changed={diffs?.risk_limits_diff} />
                </div>
              </div>

              {/* Detailed Breakdown Comparison Table */}
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--surface-alt)] border-b border-[var(--border)] text-[var(--text-muted)]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold w-1/3">Parameter / Logic Layer</th>
                      <th className="py-2.5 px-4 font-semibold w-1/3 text-[#FF7722]">Base (v{item1.version_number})</th>
                      <th className="py-2.5 px-4 font-semibold w-1/3 text-blue-500">Target (v{item2.version_number})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-mono">
                    <ComparisonRow
                      label="Symbol & Exchange"
                      valA={`${item1.symbol || "N/A"} (${item1.exchange || "N/A"})`}
                      valB={`${item2.symbol || "N/A"} (${item2.exchange || "N/A"})`}
                    />
                    <ComparisonRow
                      label="Trading Mode"
                      valA={item1.trading_mode || "INTRADAY"}
                      valB={item2.trading_mode || "INTRADAY"}
                    />
                    <ComparisonRow
                      label="Execution Timeframe"
                      valA={item1.timeframe || "5m"}
                      valB={item2.timeframe || "5m"}
                    />
                    <ComparisonRow
                      label="Category"
                      valA={item1.category || "N/A"}
                      valB={item2.category || "N/A"}
                    />
                    <ComparisonRow
                      label="Indicators Registered"
                      valA={Array.isArray(item1.indicators) && item1.indicators.length > 0 ? item1.indicators.join(", ") : "None"}
                      valB={Array.isArray(item2.indicators) && item2.indicators.length > 0 ? item2.indicators.join(", ") : "None"}
                    />
                    <ComparisonRow
                      label="Stop Loss"
                      valA={item1.stop_loss ? `${item1.stop_loss_method || "FIXED"} (${item1.stop_loss})` : "None"}
                      valB={item2.stop_loss ? `${item2.stop_loss_method || "FIXED"} (${item2.stop_loss})` : "None"}
                    />
                    <ComparisonRow
                      label="Profit Target"
                      valA={item1.profit_target ? `${item1.profit_target_method || "FIXED"} (${item1.profit_target})` : "None"}
                      valB={item2.profit_target ? `${item2.profit_target_method || "FIXED"} (${item2.profit_target})` : "None"}
                    />
                    <ComparisonRow
                      label="Trailing SL"
                      valA={item1.tsl_enabled ? `Active (Act: ${item1.tsl_activation || "0"}, Dist: ${item1.tsl_distance || "0"})` : "Disabled"}
                      valB={item2.tsl_enabled ? `Active (Act: ${item2.tsl_activation || "0"}, Dist: ${item2.tsl_distance || "0"})` : "Disabled"}
                    />
                    <ComparisonRow
                      label="Capital Allocation"
                      valA={item1.capital_allocation_inr ? `₹${item1.capital_allocation_inr.toLocaleString("en-IN")}` : "N/A"}
                      valB={item2.capital_allocation_inr ? `₹${item2.capital_allocation_inr.toLocaleString("en-IN")}` : "N/A"}
                    />
                    <ComparisonRow
                      label="Max Daily Loss Limit"
                      valA={item1.daily_loss_limit_inr ? `₹${item1.daily_loss_limit_inr.toLocaleString("en-IN")}` : "Unlimited"}
                      valB={item2.daily_loss_limit_inr ? `₹${item2.daily_loss_limit_inr.toLocaleString("en-IN")}` : "Unlimited"}
                    />
                  </tbody>
                </table>
              </div>

              {/* Backtest Comparability Notice */}
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-1">
                <div className="font-bold text-amber-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Quantitative Comparability & Performance Disclosure
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Historical backtest metrics are not guarantees of future performance. Cross-strategy performance comparisons are only statistically meaningful if evaluated over identical historical date ranges, identical execution fees (STT, GST, SEBI turnover, exchange fees), and identical order slippage assumptions.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}

function DiffBadge({ label, changed }: { label: string; changed?: boolean }) {
  return (
    <div
      className={`p-2 rounded-lg border text-center transition-colors ${
        changed
          ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
          : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)]"
      }`}
    >
      <div className="text-[10px] font-medium">{label}</div>
      <div className="text-[11px] font-bold mt-0.5">
        {changed ? "Changed" : "Identical"}
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  valA,
  valB,
}: {
  label: string;
  valA: string;
  valB: string;
}) {
  const isDifferent = valA !== valB;

  return (
    <tr className={isDifferent ? "bg-amber-500/5" : undefined}>
      <td className="py-2 px-4 font-sans font-medium text-[var(--text)]">{label}</td>
      <td className={`py-2 px-4 ${isDifferent ? "text-[#FF7722] font-semibold" : "text-[var(--text-muted)]"}`}>
        {valA}
      </td>
      <td className={`py-2 px-4 ${isDifferent ? "text-blue-500 font-semibold" : "text-[var(--text-muted)]"}`}>
        {valB}
      </td>
    </tr>
  );
}
