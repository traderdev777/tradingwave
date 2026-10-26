"use client";

import React from "react";
import {
  ConditionGroup,
  ConditionRule,
  StrategySpec,
  SupportedTimeframe,
  ORBSettingsSpec,
  TSLSettingsSpec,
  DEFAULT_ORB_SETTINGS,
  DEFAULT_TSL_SETTINGS,
} from "../../lib/api";
import {
  Sliders,
  Compass,
  Clock,
  Zap,
  Target,
  ShieldAlert,
  Layers,
  Activity,
  AlertCircle,
  HelpCircle,
  Check,
} from "lucide-react";
import { SelectedNodeType } from "./types";

interface BlockInspectorProps {
  spec: StrategySpec;
  selectedNode: SelectedNodeType | null;
  onUpdateSpec: (updatedSpec: StrategySpec) => void;
}

const SUPPORTED_TIMEFRAMES: SupportedTimeframe[] = [
  "1m",
  "2m",
  "3m",
  "5m",
  "10m",
  "15m",
  "16m",
  "30m",
  "45m",
  "60m",
  "1d",
];

const PRICE_FIELDS = [
  { value: "close", label: "Close Price" },
  { value: "open", label: "Open Price" },
  { value: "high", label: "High Price" },
  { value: "low", label: "Low Price" },
  { value: "volume", label: "Volume" },
  { value: "typical_price", label: "Typical Price (H+L+C)/3" },
  { value: "orb_high", label: "Opening Range High (ORB High)" },
  { value: "orb_low", label: "Opening Range Low (ORB Low)" },
  { value: "orb_midpoint", label: "ORB Midpoint (H+L)/2" },
  { value: "first_orb_candle_high", label: "First ORB Candle High" },
  { value: "first_orb_candle_low", label: "First ORB Candle Low" },
];

const OPERATORS = [
  { value: "GREATER_THAN", label: "Greater Than (>)" },
  { value: "LESS_THAN", label: "Less Than (<)" },
  { value: "GREATER_THAN_OR_EQUAL", label: "Greater Than or Equal (>=)" },
  { value: "LESS_THAN_OR_EQUAL", label: "Less Than or Equal (<=)" },
  { value: "EQUALS", label: "Equals (==)" },
  { value: "CROSSES_ABOVE", label: "Crosses Above (Bullish Crossover)" },
  { value: "CROSSES_BELOW", label: "Crosses Below (Bearish Crossover)" },
];

export function BlockInspector({
  spec,
  selectedNode,
  onUpdateSpec,
}: BlockInspectorProps) {
  if (!selectedNode) {
    return (
      <aside className="w-80 border-l border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col items-center justify-center text-center space-y-3 select-none transition-colors">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
          <Sliders className="w-5 h-5" />
        </div>
        <h2 className="text-xs font-bold text-[var(--text)]">Block Inspector</h2>
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Click any block, condition group, rule row, or risk module on the canvas to inspect and configure its parameters.
        </p>
      </aside>
    );
  }

  // Helper for updating nested condition rule
  function handleUpdateConditionRule(updatedRule: ConditionRule) {
    if (selectedNode?.type !== "condition_rule") return;
    const treeKey = selectedNode.treeKey;
    const currentTree: ConditionGroup = (spec as any)[treeKey];
    if (!currentTree) return;

    const nextGroups = [...(currentTree.nested_groups || [])];
    const targetGroup = nextGroups[selectedNode.groupIndex];
    if (!targetGroup) return;

    targetGroup.conditions[selectedNode.ruleIndex] = updatedRule;

    onUpdateSpec({
      ...spec,
      [treeKey]: {
        ...currentTree,
        nested_groups: nextGroups,
      },
    });
  }

  const updateOrb = (patch: Partial<ORBSettingsSpec>) =>
    onUpdateSpec({
      ...spec,
      orb_settings: { ...DEFAULT_ORB_SETTINGS, ...spec.orb_settings, ...patch },
    });

  const updateTsl = (patch: Partial<TSLSettingsSpec>) =>
    onUpdateSpec({
      ...spec,
      tsl_settings: { ...DEFAULT_TSL_SETTINGS, ...spec.tsl_settings, ...patch },
    });

  return (
    <aside className="w-80 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col flex-shrink-0 select-none overflow-y-auto transition-colors">
      {/* Inspector Header */}
      <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30 flex items-center justify-center">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
            Block Inspector
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-[var(--bg)] border border-[var(--border)] text-[#FF7722]">
          {selectedNode.type.replace("_", " ").toUpperCase()}
        </span>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* INSPECTOR VIEW 1: Strategy Header */}
        {selectedNode.type === "strategy_header" && (
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Strategy Name
              </label>
              <input
                type="text"
                value={spec.name}
                onChange={(e) => onUpdateSpec({ ...spec, name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Exchange
                </label>
                <select
                  value={spec.exchange}
                  onChange={(e) => onUpdateSpec({ ...spec, exchange: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                >
                  <option value="NSE">NSE (Equity/F&O)</option>
                  <option value="BSE">BSE</option>
                  <option value="MCX">MCX (Commodity)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={spec.symbol}
                  onChange={(e) => onUpdateSpec({ ...spec, symbol: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] font-mono font-bold focus:border-[#FF7722] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Base Timeframe
                </label>
                <select
                  value={spec.timeframe}
                  onChange={(e) => onUpdateSpec({ ...spec, timeframe: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                >
                  {SUPPORTED_TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Direction
                </label>
                <select
                  value={spec.direction}
                  onChange={(e) => onUpdateSpec({ ...spec, direction: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                >
                  <option value="BOTH">BOTH (Long & Short)</option>
                  <option value="LONG">LONG ONLY</option>
                  <option value="SHORT">SHORT ONLY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={spec.description}
                onChange={(e) => onUpdateSpec({ ...spec, description: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[#FF7722] focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* INSPECTOR VIEW 2: Opening Range (ORB) Settings */}
        {selectedNode.type === "orb_settings" && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text)]">Enable ORB Module</span>
              <input
                type="checkbox"
                checked={spec.orb_settings?.enabled}
                onChange={(e) => updateOrb({ enabled: e.target.checked })}
                className="w-4 h-4 accent-[#FF7722] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Range Start
                </label>
                <input
                  type="text"
                  value={spec.orb_settings?.range_start_time || "09:15"}
                  onChange={(e) => updateOrb({ range_start_time: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Range End
                </label>
                <input
                  type="text"
                  value={spec.orb_settings?.range_end_time || "09:30"}
                  onChange={(e) => updateOrb({ range_end_time: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  First Candle TF
                </label>
                <select
                  value={spec.orb_settings?.first_candle_timeframe || "3m"}
                  onChange={(e) => updateOrb({ first_candle_timeframe: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)]"
                >
                  <option value="1m">1 Minute</option>
                  <option value="3m">3 Minutes (Default)</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Window Calc TF
                </label>
                <select
                  value={spec.orb_settings?.calculation_timeframe || "15m"}
                  onChange={(e) => updateOrb({ calculation_timeframe: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)]"
                >
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes (Default)</option>
                  <option value="30m">30 Minutes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Entry Start
                </label>
                <input
                  type="text"
                  value={spec.orb_settings?.entry_start_time || "09:30"}
                  onChange={(e) => updateOrb({ entry_start_time: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Entry Cutoff
                </label>
                <input
                  type="text"
                  value={spec.orb_settings?.entry_cutoff_time || "14:30"}
                  onChange={(e) => updateOrb({ entry_cutoff_time: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-[var(--text)]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Confirmation Method
              </label>
              <select
                value={spec.orb_settings?.confirmation_method || "CANDLE_CLOSE"}
                onChange={(e) => updateOrb({ confirmation_method: e.target.value as any })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)]"
              >
                <option value="CANDLE_CLOSE">Candle Close (Whipsaw Filter)</option>
                <option value="HIGH_LOW_PENETRATION">High/Low Intrabar Penetration</option>
                <option value="RETEST_CONFIRMATION">Retest Confirmation</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <span className="text-[11px] text-[var(--text)]">Max Entries Per Session</span>
              <input
                type="number"
                min={1}
                max={10}
                value={spec.orb_settings?.max_entries_per_session || 2}
                onChange={(e) => updateOrb({ max_entries_per_session: parseInt(e.target.value) || 2 })}
                className="w-16 px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs text-center font-mono"
              />
            </div>
          </div>
        )}

        {/* INSPECTOR VIEW 3: Condition Rule Node */}
        {selectedNode.type === "condition_rule" && (() => {
          const treeKey = selectedNode.treeKey;
          const currentTree: ConditionGroup = (spec as any)[treeKey];
          const group = currentTree?.nested_groups?.[selectedNode.groupIndex];
          const rule = group?.conditions?.[selectedNode.ruleIndex];

          if (!rule) {
            return (
              <div className="text-xs text-[var(--text-muted)]">Rule not found.</div>
            );
          }

          return (
            <div className="space-y-4">
              <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <span className="text-[10px] font-mono text-[#FF7722] block uppercase font-bold">
                  Rule ID: {rule.id}
                </span>
                <span className="text-xs font-semibold text-[var(--text)]">
                  {rule.description || "Custom Condition"}
                </span>
              </div>

              {/* Left Operand Configuration */}
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]/50 space-y-2.5">
                <span className="text-[11px] font-bold text-[var(--text)] block uppercase tracking-wider">
                  Left Operand
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Offset</label>
                    <select
                      value={rule.left.offset ?? -1}
                      onChange={(e) =>
                        handleUpdateConditionRule({
                          ...rule,
                          left: { ...rule.left, offset: parseInt(e.target.value) },
                        })
                      }
                      className="w-full px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs font-mono"
                    >
                      <option value="0">0 (Current Forming)</option>
                      <option value="-1">-1 (Previous Closed)</option>
                      <option value="-2">-2 (Two Ago)</option>
                      <option value="-3">-3 (Three Ago)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Timeframe</label>
                    <select
                      value={rule.left.timeframe || spec.entry_timeframe}
                      onChange={(e) =>
                        handleUpdateConditionRule({
                          ...rule,
                          left: { ...rule.left, timeframe: e.target.value as any },
                        })
                      }
                      className="w-full px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs"
                    >
                      {SUPPORTED_TIMEFRAMES.map((tf) => (
                        <option key={tf} value={tf}>{tf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Price Source</label>
                  <select
                    value={rule.left.price_field || "close"}
                    onChange={(e) =>
                      handleUpdateConditionRule({
                        ...rule,
                        left: { ...rule.left, price_field: e.target.value, type: "price_field" },
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs"
                  >
                    {PRICE_FIELDS.map((pf) => (
                      <option key={pf.value} value={pf.value}>{pf.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Operator */}
              <div>
                <label className="text-[11px] font-bold text-[var(--text)] block mb-1 uppercase tracking-wider">
                  Comparison Operator
                </label>
                <select
                  value={rule.operator}
                  onChange={(e) =>
                    handleUpdateConditionRule({
                      ...rule,
                      operator: e.target.value as any,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[#FF7722]/50 text-xs text-[#FF7722] font-mono font-bold"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              {/* Right Operand Configuration */}
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]/50 space-y-2.5">
                <span className="text-[11px] font-bold text-[var(--text)] block uppercase tracking-wider">
                  Right Operand / Target
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Target Type</label>
                    <select
                      value={rule.right.type}
                      onChange={(e) =>
                        handleUpdateConditionRule({
                          ...rule,
                          right: {
                            ...rule.right,
                            type: e.target.value as any,
                            constant_value: e.target.value === "constant" ? 22000.0 : undefined,
                            price_field: e.target.value === "price_field" ? "orb_high" : undefined,
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs"
                    >
                      <option value="price_field">Market/ORB Level</option>
                      <option value="constant">Fixed Constant Value</option>
                    </select>
                  </div>

                  {rule.right.type === "constant" ? (
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Value</label>
                      <input
                        type="number"
                        step="any"
                        value={rule.right.constant_value ?? 0}
                        onChange={(e) =>
                          handleUpdateConditionRule({
                            ...rule,
                            right: { ...rule.right, constant_value: parseFloat(e.target.value) || 0 },
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Reference Source</label>
                      <select
                        value={rule.right.price_field || "orb_high"}
                        onChange={(e) =>
                          handleUpdateConditionRule({
                            ...rule,
                            right: { ...rule.right, price_field: e.target.value },
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs font-mono font-bold text-[#FF7722]"
                      >
                        {PRICE_FIELDS.map((pf) => (
                          <option key={pf.value} value={pf.value}>{pf.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* INSPECTOR VIEW 4: Trailing Stop-Loss Settings */}
        {selectedNode.type === "tsl_settings" && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text)]">Enable Trailing Stop</span>
              <input
                type="checkbox"
                checked={spec.tsl_settings?.enabled}
                onChange={(e) => updateTsl({ enabled: e.target.checked })}
                className="w-4 h-4 accent-[#FF7722] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Activation Type
                </label>
                <select
                  value={spec.tsl_settings?.activation_type || "POINTS"}
                  onChange={(e) => updateTsl({ activation_type: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)]"
                >
                  <option value="POINTS">Points (e.g. 20 pts)</option>
                  <option value="PERCENTAGE">Percentage (1.0%)</option>
                  <option value="R_MULTIPLE">R-Multiple (1.5R)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Activation Val
                </label>
                <input
                  type="number"
                  step="any"
                  value={spec.tsl_settings?.activation_value || 20.0}
                  onChange={(e) => updateTsl({ activation_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Trailing Distance
                </label>
                <input
                  type="number"
                  step="any"
                  value={spec.tsl_settings?.distance_value || 10.0}
                  onChange={(e) => updateTsl({ distance_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  Distance Unit
                </label>
                <select
                  value={spec.tsl_settings?.distance_type || "POINTS"}
                  onChange={(e) => updateTsl({ distance_type: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text)]"
                >
                  <option value="POINTS">Points</option>
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="ATR_MULTIPLIER">ATR Multiplier</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 leading-relaxed font-sans">
              <strong>Plain-English Rule:</strong> Activate trailing stop after{" "}
              {spec.tsl_settings?.activation_value || 20}{" "}
              {spec.tsl_settings?.activation_type?.toLowerCase() || "points"} of favorable movement, then trail{" "}
              {spec.tsl_settings?.distance_value || 10}{" "}
              {spec.tsl_settings?.distance_type?.toLowerCase() || "points"} behind high-water mark monotonically.
            </div>
          </div>
        )}

        {/* INSPECTOR VIEW 5: Risk Limits */}
        {selectedNode.type === "risk_limits" && (
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Capital Allocation (INR)
              </label>
              <input
                type="number"
                value={spec.position_sizing.allocation_capital_inr}
                onChange={(e) =>
                  onUpdateSpec({
                    ...spec,
                    position_sizing: {
                      ...spec.position_sizing,
                      allocation_capital_inr: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Daily Loss Circuit Limit (INR)
              </label>
              <input
                type="number"
                value={spec.risk_limits.daily_loss_limit_inr}
                onChange={(e) =>
                  onUpdateSpec({
                    ...spec,
                    risk_limits: {
                      ...spec.risk_limits,
                      daily_loss_limit_inr: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono text-red-400 font-bold"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <span className="text-xs text-[var(--text)]">Prevent Duplicate Open Entries</span>
              <input
                type="checkbox"
                checked={spec.risk_limits.prevent_duplicate_entries}
                onChange={(e) =>
                  onUpdateSpec({
                    ...spec,
                    risk_limits: {
                      ...spec.risk_limits,
                      prevent_duplicate_entries: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-[#FF7722] cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
