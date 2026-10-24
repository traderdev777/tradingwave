"use client";

import React, { useState } from "react";
import {
  ConditionGroup,
  ConditionOperand,
  ConditionRule,
  IndicatorSpec,
  StrategySpec,
} from "../../lib/api";
import {
  Sliders,
  Layers,
  Plus,
  Trash2,
  Shield,
  Activity,
  Zap,
  Clock,
  DollarSign,
  Compass,
  AlertTriangle,
} from "lucide-react";

interface RuleBuilderPanelProps {
  spec: StrategySpec;
  onChangeSpec: (updated: StrategySpec) => void;
}

export function RuleBuilderPanel({ spec, onChangeSpec }: RuleBuilderPanelProps) {
  const [activeTab, setActiveTab] = useState<"logic" | "exit_risk" | "overview">("logic");

  // Helper updaters
  function updateSpec(patch: Partial<StrategySpec>) {
    onChangeSpec({ ...spec, ...patch });
  }

  function handleAddCondition() {
    const newCond: ConditionRule = {
      id: `cond_${Math.random().toString(36).substring(2, 8)}`,
      left: {
        type: "price_field",
        price_field: "close",
        offset: 0,
      },
      operator: "CROSSES_ABOVE",
      right: {
        type: "constant",
        constant_value: 100.0,
        offset: 0,
      },
      description: "Custom condition rule",
    };

    const existingConditions = spec.entry_rules?.conditions || [];
    updateSpec({
      entry_rules: {
        ...spec.entry_rules,
        conditions: [...existingConditions, newCond],
      },
    });
  }

  function handleRemoveCondition(condId: string) {
    const updated = (spec.entry_rules?.conditions || []).filter((c) => c.id !== condId);
    updateSpec({
      entry_rules: {
        ...spec.entry_rules,
        conditions: updated,
      },
    });
  }

  function handleUpdateCondition(condId: string, patch: Partial<ConditionRule>) {
    const updated = (spec.entry_rules?.conditions || []).map((c) => {
      if (c.id === condId) {
        return { ...c, ...patch };
      }
      return c;
    });
    updateSpec({
      entry_rules: {
        ...spec.entry_rules,
        conditions: updated,
      },
    });
  }

  function handleAddIndicator() {
    const newInd: IndicatorSpec = {
      id: `ind_${Math.random().toString(36).substring(2, 8)}`,
      type: "EMA",
      period: 20,
      source: "close",
    };
    updateSpec({
      indicators: [...(spec.indicators || []), newInd],
    });
  }

  function handleRemoveIndicator(indId: string) {
    updateSpec({
      indicators: (spec.indicators || []).filter((i) => i.id !== indId),
    });
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Panel Sub-Navigation */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--bg)]/40 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#FF7722]/15 text-[#FF7722]">
            <Sliders className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[var(--text)] tracking-tight">Strategy Specification</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30 uppercase">
            {spec.exchange}:{spec.symbol} • {spec.timeframe}
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-[var(--surface)] p-1 border border-[var(--border)] text-xs">
          <button
            onClick={() => setActiveTab("logic")}
            className={`px-3 py-1 font-semibold rounded-md transition-all ${
              activeTab === "logic"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Entry Rules ({spec.entry_rules?.conditions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("exit_risk")}
            className={`px-3 py-1 font-semibold rounded-md transition-all ${
              activeTab === "exit_risk"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Exit & Risk
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1 font-semibold rounded-md transition-all ${
              activeTab === "overview"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Parameters
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* TAB 1: ENTRY LOGIC & INDICATORS */}
        {activeTab === "logic" && (
          <div className="space-y-4">
            {/* Indicators Strip */}
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#FF7722]" />
                  <span>Configured Indicators ({spec.indicators?.length || 0})</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddIndicator}
                  className="text-[11px] font-bold text-[#FF7722] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Indicator</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(spec.indicators || []).map((ind, idx) => (
                  <div
                    key={ind.id || idx}
                    className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-[var(--text)] font-mono">{ind.type}</span>
                      <span className="text-[10px] text-[var(--text-muted)] block font-mono">
                        Period: {ind.period} {ind.multiplier ? `• Mult: ${ind.multiplier}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveIndicator(ind.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                      title="Remove indicator"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Condition Rules Builder */}
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FF7722]" />
                  <span className="text-xs font-bold text-[var(--text)]">Condition Logic Tree</span>
                  <select
                    value={spec.entry_rules?.logic || "AND"}
                    onChange={(e) =>
                      updateSpec({
                        entry_rules: {
                          ...spec.entry_rules,
                          logic: e.target.value as "AND" | "OR",
                        },
                      })
                    }
                    className="bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-0.5 text-[10px] font-mono font-bold text-[#FF7722]"
                  >
                    <option value="AND">ALL (AND)</option>
                    <option value="OR">ANY (OR)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="px-2.5 py-1 rounded-lg bg-[#FF7722] hover:bg-[#E65A00] text-white text-[11px] font-bold shadow-sm flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Condition</span>
                </button>
              </div>

              {/* Condition Cards */}
              <div className="space-y-2.5">
                {(spec.entry_rules?.conditions || []).map((cond, idx) => (
                  <div
                    key={cond.id || idx}
                    className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2 hover:border-[#FF7722]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
                      <span className="font-mono text-[#FF7722]">Rule #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(cond.id)}
                        className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Left Operand */}
                      <div>
                        <label className="text-[10px] text-[var(--text-muted)] block mb-1">Left Operand</label>
                        <input
                          type="text"
                          value={cond.left?.price_field || cond.left?.indicator_type || "close"}
                          onChange={(e) =>
                            handleUpdateCondition(cond.id, {
                              left: { ...cond.left, price_field: e.target.value as any },
                            })
                          }
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                        />
                      </div>

                      {/* Operator */}
                      <div>
                        <label className="text-[10px] text-[var(--text-muted)] block mb-1">Comparison</label>
                        <select
                          value={cond.operator}
                          onChange={(e) =>
                            handleUpdateCondition(cond.id, { operator: e.target.value as any })
                          }
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                        >
                          <option value="CROSSES_ABOVE">CROSSES ABOVE</option>
                          <option value="CROSSES_BELOW">CROSSES BELOW</option>
                          <option value="GREATER_THAN">GREATER THAN (&gt;)</option>
                          <option value="LESS_THAN">LESS THAN (&lt;)</option>
                          <option value="EQUALS">EQUALS (==)</option>
                          <option value="BETWEEN">BETWEEN</option>
                        </select>
                      </div>

                      {/* Right Operand */}
                      <div>
                        <label className="text-[10px] text-[var(--text-muted)] block mb-1">Right Operand / Value</label>
                        <input
                          type="text"
                          value={
                            cond.right?.constant_value !== undefined
                              ? cond.right.constant_value
                              : cond.right?.indicator_type || ""
                          }
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleUpdateCondition(cond.id, {
                              right: isNaN(val)
                                ? { ...cond.right, type: "indicator", indicator_type: e.target.value as any }
                                : { ...cond.right, type: "constant", constant_value: val },
                            });
                          }}
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                        />
                      </div>
                    </div>

                    {cond.description && (
                      <p className="text-[10px] text-[var(--text-muted)] italic font-mono pt-1">
                        &quot;{cond.description}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXIT LOGIC & RISK CONTROLS */}
        {activeTab === "exit_risk" && (
          <div className="space-y-4">
            {/* Exit Criteria Card */}
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#FF7722]" />
                <span>Exit Criteria & Profit Targets</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                    Stop Loss (% of entry price)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={spec.exit_rules?.stop_loss_pct ?? ""}
                    onChange={(e) =>
                      updateSpec({
                        exit_rules: {
                          ...spec.exit_rules,
                          stop_loss_pct: parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                    placeholder="e.g. 0.75"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                    Take Profit Target (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={spec.exit_rules?.target_profit_pct ?? ""}
                    onChange={(e) =>
                      updateSpec({
                        exit_rules: {
                          ...spec.exit_rules,
                          target_profit_pct: parseFloat(e.target.value) || undefined,
                        },
                      })
                    }
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                    placeholder="e.g. 1.75"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                    Intraday Auto Square-Off
                  </label>
                  <input
                    type="text"
                    value={spec.exit_rules?.intraday_auto_squareoff || "15:15 IST"}
                    onChange={(e) =>
                      updateSpec({
                        exit_rules: {
                          ...spec.exit_rules,
                          intraday_auto_squareoff: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="trailing_stop"
                    checked={spec.exit_rules?.trailing_stop_enabled || false}
                    onChange={(e) =>
                      updateSpec({
                        exit_rules: {
                          ...spec.exit_rules,
                          trailing_stop_enabled: e.target.checked,
                          trailing_stop_trigger_pct: e.target.checked ? 1.0 : undefined,
                          trailing_stop_step_pct: e.target.checked ? 0.25 : undefined,
                        },
                      })
                    }
                    className="rounded border-[var(--border)] text-[#FF7722] focus:ring-[#FF7722]"
                  />
                  <label htmlFor="trailing_stop" className="text-[11px] font-medium text-[var(--text)] cursor-pointer">
                    Enable Trailing Stop Loss
                  </label>
                </div>
              </div>
            </div>

            {/* Risk Controls Card */}
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#FF7722]" />
                <span>Pre-Trade Hard Risk Limits</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                    Daily Loss Circuit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={spec.risk_limits?.daily_loss_limit_inr || 15000}
                    onChange={(e) =>
                      updateSpec({
                        risk_limits: {
                          ...spec.risk_limits,
                          daily_loss_limit_inr: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                    Max Concurrent Open Positions
                  </label>
                  <input
                    type="number"
                    value={spec.risk_limits?.max_open_positions || 3}
                    onChange={(e) =>
                      updateSpec({
                        risk_limits: {
                          ...spec.risk_limits,
                          max_open_positions: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                    Capital Allocation (₹)
                  </label>
                  <input
                    type="number"
                    value={spec.position_sizing?.allocation_capital_inr || 500000}
                    onChange={(e) =>
                      updateSpec({
                        position_sizing: {
                          ...spec.position_sizing,
                          allocation_capital_inr: parseFloat(e.target.value) || 10000,
                        },
                      })
                    }
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                    Entry Cooldown (Candle Bars)
                  </label>
                  <input
                    type="number"
                    value={spec.risk_limits?.entry_cooldown_bars ?? 3}
                    onChange={(e) =>
                      updateSpec({
                        risk_limits: {
                          ...spec.risk_limits,
                          entry_cooldown_bars: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OVERVIEW & GENERAL PARAMETERS */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
              <span className="text-xs font-bold text-[var(--text)] block">Instrument & Market Setup</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">Strategy Name</label>
                  <input
                    type="text"
                    value={spec.name}
                    onChange={(e) => updateSpec({ name: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">Exchange</label>
                  <select
                    value={spec.exchange}
                    onChange={(e) => updateSpec({ exchange: e.target.value as any })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  >
                    <option value="NSE">NSE (National Stock Exchange)</option>
                    <option value="MCX">MCX (Multi Commodity Exchange)</option>
                    <option value="BSE">BSE (Bombay Stock Exchange)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">Trading Symbol</label>
                  <input
                    type="text"
                    value={spec.symbol}
                    onChange={(e) => updateSpec({ symbol: e.target.value.toUpperCase() })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">Timeframe</label>
                  <select
                    value={spec.timeframe}
                    onChange={(e) => updateSpec({ timeframe: e.target.value as any })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  >
                    <option value="1m">1m (High-frequency)</option>
                    <option value="3m">3m (Fast Scalp)</option>
                    <option value="5m">5m (Intraday Scalp)</option>
                    <option value="15m">15m (Momentum)</option>
                    <option value="30m">30m (Swing / Commodity)</option>
                    <option value="1h">1h (Hourly)</option>
                    <option value="1d">1d (Daily Positional)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-[var(--text)] block mb-1">Trading Session Hours</label>
                  <input
                    type="text"
                    value={spec.trading_session}
                    onChange={(e) => updateSpec({ trading_session: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono text-[var(--text)] focus:outline-none focus:border-[#FF7722]"
                  />
                </div>
              </div>
            </div>

            {/* Execution Taxes & Slippage */}
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
              <span className="text-xs font-bold text-[var(--text)] block">Statutory Charges & Slippage</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Brokerage</span>
                  <span className="font-bold text-[var(--text)]">₹20 / order</span>
                </div>
                <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Slippage Model</span>
                  <span className="font-bold text-[var(--text)]">0.05%</span>
                </div>
                <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Taxes (STT/CTT)</span>
                  <span className="font-bold text-[var(--profit)]">Enabled</span>
                </div>
                <div className="p-2 rounded bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">GST & Turnover</span>
                  <span className="font-bold text-[var(--profit)]">18% GST</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
