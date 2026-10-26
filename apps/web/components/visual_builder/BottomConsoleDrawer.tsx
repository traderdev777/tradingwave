"use client";

import React, { useState } from "react";
import {
  StrategySpec,
  ValidationReport,
} from "../../lib/api";
import {
  FileText,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  Sparkles,
  Lock,
} from "lucide-react";

interface BottomConsoleDrawerProps {
  spec: StrategySpec;
  validation: ValidationReport | null;
  validating: boolean;
}

export function BottomConsoleDrawer({
  spec,
  validation,
  validating,
}: BottomConsoleDrawerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"summary" | "validation" | "assumptions">("summary");

  const errors = validation?.issues?.filter((i) => i.severity === "ERROR") || [];
  const warnings = validation?.issues?.filter((i) => i.severity === "WARNING") || [];
  const errorsCount = validation?.error_count ?? errors.length;
  const warningsCount = validation?.warning_count ?? warnings.length;
  const isClean = validation?.can_backtest && errorsCount === 0;

  // Generate plain-English explanation dynamically from canonical AST
  function generateSummaryText(): string[] {
    const lines: string[] = [];
    lines.push(
      `1. Market Monitoring: Evaluates ${spec.exchange}:${spec.symbol} on ${spec.timeframe} candlestick bars during ${spec.trading_session} in ${spec.trading_mode} mode.`
    );

    if (spec.orb_settings?.enabled) {
      lines.push(
        `2. Opening Range: Calculates ORB High & Low over ${spec.orb_settings.range_start_time}-${spec.orb_settings.range_end_time} using first ${spec.orb_settings.first_candle_timeframe || "3m"} candle. Entry window active between ${spec.orb_settings.entry_start_time} and ${spec.orb_settings.entry_cutoff_time} IST.`
      );
    }

    if (spec.call_entry_rules?.nested_groups && spec.call_entry_rules.nested_groups.length > 0) {
      const callGroupsText = spec.call_entry_rules.nested_groups
        .map((g, idx) => {
          const rules = g.conditions
            .map((c) => `Candle ${c.left.offset} ${c.left.price_field || "Close"} ${c.operator} ${c.right.price_field || c.right.constant_value}`)
            .join(` ${g.logic} `);
          return `Group ${String.fromCharCode(65 + idx)} [${rules}]`;
        })
        .join(` ${spec.call_entry_rules.logic} `);
      lines.push(`3. CALL Entry: Triggers when ${callGroupsText}.`);
    }

    if (spec.put_entry_rules?.nested_groups && spec.put_entry_rules.nested_groups.length > 0) {
      const putGroupsText = spec.put_entry_rules.nested_groups
        .map((g, idx) => {
          const rules = g.conditions
            .map((c) => `Candle ${c.left.offset} ${c.left.price_field || "Close"} ${c.operator} ${c.right.price_field || c.right.constant_value}`)
            .join(` ${g.logic} `);
          return `Group ${String.fromCharCode(65 + idx)} [${rules}]`;
        })
        .join(` ${spec.put_entry_rules.logic} `);
      lines.push(`4. PUT Entry (Inverse): Triggers when ${putGroupsText}.`);
    }

    lines.push(
      `5. Exits & Sizing: Fixed capital of ₹${spec.position_sizing.allocation_capital_inr.toLocaleString()} with Stop Loss at ${spec.exit_rules.stop_loss_pct || 0.65}% and Profit Target at ${spec.exit_rules.target_profit_pct || 1.50}%.`
    );

    if (spec.tsl_settings?.enabled) {
      lines.push(
        `6. Trailing Stop: Activates after ${spec.tsl_settings.activation_value} ${spec.tsl_settings.activation_type.toLowerCase()} profit and ratchets ${spec.tsl_settings.distance_value} ${spec.tsl_settings.distance_type.toLowerCase()} behind high-water mark.`
      );
    }

    if (spec.trading_mode === "INTRADAY") {
      lines.push(
        `7. Circuit & Square-Off: Mandatory intraday square-off at ${spec.exit_rules.intraday_auto_squareoff} and max daily loss circuit of ₹${spec.risk_limits.daily_loss_limit_inr.toLocaleString()}.`
      );
    } else {
      lines.push(
        `7. BTST Overnight Swing: Next-session exit active between ${spec.btst_settings?.next_session_exit_start || "09:15"} and ${spec.btst_settings?.next_session_exit_cutoff || "09:30"} IST.`
      );
    }

    return lines;
  }

  const summaryLines = generateSummaryText();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] select-none flex flex-col transition-all">
      {/* Console Drawer Bar Header */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]">
        {/* Drawer Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab("summary");
              setIsOpen(true);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isOpen && activeTab === "summary"
                ? "bg-[#FF7722]/15 text-[#FF7722]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Strategy Preview
          </button>

          <button
            onClick={() => {
              setActiveTab("validation");
              setIsOpen(true);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isOpen && activeTab === "validation"
                ? "bg-[#FF7722]/15 text-[#FF7722]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Validation</span>
            {errorsCount > 0 ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-red-500 text-white">
                {errorsCount}
              </span>
            ) : isClean ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : null}
          </button>

          <button
            onClick={() => {
              setActiveTab("assumptions");
              setIsOpen(true);
            }}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isOpen && activeTab === "assumptions"
                ? "bg-[#FF7722]/15 text-[#FF7722]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Execution Assumptions
          </button>
        </div>

        {/* Right side status indicator & Toggle Drawer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {validating ? (
              <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Validating...
              </span>
            ) : isClean ? (
              <span className="text-emerald-500 font-semibold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Validation Clean
              </span>
            ) : (
              <span className="text-red-400 font-semibold flex items-center gap-1 text-[11px]">
                <XCircle className="w-3.5 h-3.5" />
                {errorsCount} Blocking {errorsCount === 1 ? "Error" : "Errors"}
              </span>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      {isOpen && (
        <div className="h-44 overflow-y-auto p-4 bg-[var(--bg)] font-sans text-xs">
          {/* TAB 1: Live Plain-English Strategy Preview */}
          {activeTab === "summary" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                <span className="text-[11px] font-bold text-[#FF7722] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Synthesized Plain-English Logic
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  Compiled from Strategy AST
                </span>
              </div>
              <div className="space-y-1.5 text-[var(--text)] leading-relaxed">
                {summaryLines.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF7722] mt-1.5 flex-shrink-0" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Validation Messages */}
          {activeTab === "validation" && (
            <div className="space-y-2">
              {errorsCount === 0 && warningsCount === 0 ? (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Pre-Flight Deterministic Validation Passed</div>
                    <div className="text-[11px] text-emerald-400/80">
                      All condition trees, timeframes, offsets, and risk limits satisfy institutional exchange specifications. Strategy is ready for Backtesting Laboratory or Paper Trading.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {errors.map((err, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs flex items-start gap-2.5"
                    >
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-mono text-[10px] font-bold text-red-400">
                          [{err.code || "VALIDATION_ERROR"}] {err.affected_field || "General AST"}
                        </div>
                        <div className="text-[11px] text-red-300 font-medium">{err.message}</div>
                        {err.suggested_correction && (
                          <div className="text-[10px] text-red-400/80 mt-0.5 font-mono">
                            Suggestion: {err.suggested_correction}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {warnings.map((warn, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2.5"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-mono text-[10px] font-bold text-amber-400">
                          [{warn.code || "WARNING"}] {warn.affected_field || "Strategy Rule"}
                        </div>
                        <div className="text-[11px] text-amber-300 font-medium">{warn.message}</div>
                        {warn.suggested_correction && (
                          <div className="text-[10px] text-amber-400/80 mt-0.5 font-mono">
                            Suggestion: {warn.suggested_correction}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Execution Assumptions */}
          {activeTab === "assumptions" && (
            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1.5">
                <span className="font-bold text-[var(--text)] uppercase text-[10px] tracking-wider block">
                  Statutory Costs & Slippage
                </span>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Slippage Model:</span>
                  <span className="font-mono text-[var(--text)]">0.05% per executed leg</span>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Brokerage:</span>
                  <span className="font-mono text-[var(--text)]">₹20 flat per order</span>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>STT / CTT:</span>
                  <span className="font-mono text-[var(--text)]">0.0125% on Intraday Option / Equity</span>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>GST & Turnover:</span>
                  <span className="font-mono text-[var(--text)]">18% GST on brokerage + SEBI fees</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1.5">
                <span className="font-bold text-[var(--text)] uppercase text-[10px] tracking-wider block">
                  Safety & SEBI Compliance Gate
                </span>
                <div className="flex items-center gap-2 text-amber-500 font-mono text-[10px]">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>LIVE_TRADING_ENABLED = false (Compliance Lock)</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  Backtesting runs against deterministic Parquet bars. Paper trading routes to virtual ledgers without real capital exposure.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </footer>
  );
}
