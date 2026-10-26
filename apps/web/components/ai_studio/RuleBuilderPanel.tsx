"use client";

import React, { useState } from "react";
import {
  ConditionGroup,
  ConditionOperand,
  ConditionRule,
  IndicatorSpec,
  ORBSettingsSpec,
  ProfitTargetLeg,
  StrategySpec,
  SupportedTimeframe,
  TSLSettingsSpec,
} from "../../lib/api";
import {
  Sliders,
  Layers,
  Plus,
  Trash2,
  Copy,
  Shield,
  Activity,
  Zap,
  Clock,
  DollarSign,
  Compass,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Crosshair,
  TrendingUp,
  FileText,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Split,
  Binary,
} from "lucide-react";

interface RuleBuilderPanelProps {
  spec: StrategySpec;
  onChangeSpec: (updated: StrategySpec) => void;
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
  "1h",
  "60m",
  "1d",
];

const CANDLE_REFERENCES = [
  { value: 0, label: "0 — Current candle (forming)" },
  { value: -1, label: "-1 — Previous candle (closed)" },
  { value: -2, label: "-2 — Two candles ago" },
  { value: -3, label: "-3 — Three candles ago" },
  { value: -4, label: "-4 — Four candles ago" },
  { value: -5, label: "-5 — Five candles ago" },
];

const PRICE_SOURCES = [
  { value: "close", label: "Close Price" },
  { value: "open", label: "Open Price" },
  { value: "high", label: "High Price" },
  { value: "low", label: "Low Price" },
  { value: "volume", label: "Volume" },
  { value: "typical_price", label: "Typical Price (HLC3)" },
  { value: "orb_high", label: "Opening Range High (ORB High)" },
  { value: "orb_low", label: "Opening Range Low (ORB Low)" },
  { value: "orb_midpoint", label: "Opening Range Midpoint" },
  { value: "first_orb_candle_high", label: "First ORB Candle High (e.g. 3m)" },
  { value: "first_orb_candle_low", label: "First ORB Candle Low (e.g. 3m)" },
  { value: "prev_candle_high", label: "Previous Candle High" },
  { value: "prev_candle_low", label: "Previous Candle Low" },
];

const COMPARISON_OPERATORS = [
  { value: "LESS_THAN", label: "Less Than (<)" },
  { value: "GREATER_THAN", label: "Greater Than (>)" },
  { value: "CROSSES_ABOVE", label: "Crosses Above (↑)" },
  { value: "CROSSES_BELOW", label: "Crosses Below (↓)" },
  { value: "LESS_THAN_OR_EQUAL", label: "Less Than or Equal (≤)" },
  { value: "GREATER_THAN_OR_EQUAL", label: "Greater Than or Equal (≥)" },
  { value: "EQUALS", label: "Equals (=)" },
  { value: "CROSSES_ABOVE_LEVEL", label: "Crosses Above Level" },
  { value: "CROSSES_BELOW_LEVEL", label: "Crosses Below Level" },
];

type TreeKey = "call_entry_rules" | "put_entry_rules" | "call_exit_rules" | "put_exit_rules";

export function RuleBuilderPanel({ spec, onChangeSpec }: RuleBuilderPanelProps) {
  const isOrb = spec.category === "ORB" || spec.orb_settings?.enabled;
  const isBtst = spec.trading_mode === "BTST" || spec.btst_settings?.enabled;

  const [activeTab, setActiveTab] = useState<
    "overview" | "orb" | "call_entry" | "put_entry" | "call_exit" | "put_exit" | "stop_targets" | "tsl" | "risk" | "summary"
  >(isOrb ? "call_entry" : "call_entry");

  function updateSpec(patch: Partial<StrategySpec>) {
    onChangeSpec({ ...spec, ...patch });
  }

  // Canonical tree initializers
  function getOrCreateTree(treeKey: TreeKey): ConditionGroup {
    if (spec[treeKey]) {
      const existing = spec[treeKey] as ConditionGroup;
      if (existing.nested_groups && existing.nested_groups.length > 0) {
        return existing;
      }
      if (existing.conditions && existing.conditions.length > 0) {
        // Wrap flat conditions in Group A
        return {
          id: existing.id || `grp_root_${treeKey}`,
          logic: "OR",
          conditions: [],
          nested_groups: [
            {
              id: `grp_a_${treeKey}`,
              logic: existing.logic || "AND",
              conditions: existing.conditions,
              nested_groups: [],
            },
          ],
        };
      }
    }

    const entryTf = spec.entry_timeframe || spec.timeframe || "5m";
    const exitTf = spec.exit_timeframe || "1m";

    if (treeKey === "call_entry_rules") {
      // Default canonical ORB CALL Entry: (A1 AND A2) OR (B1 AND B2)
      return {
        id: "grp_call_entry_root",
        logic: "OR",
        conditions: [],
        nested_groups: [
          {
            id: "grp_call_a",
            logic: "AND",
            conditions: [
              {
                id: "rule_call_a1",
                left: { type: "price_field", price_field: "close", offset: -2, timeframe: entryTf },
                operator: "LESS_THAN",
                right: { type: "price_field", price_field: "orb_high", offset: 0 },
                description: "Candle -2 Close < ORB High",
              },
              {
                id: "rule_call_a2",
                left: { type: "price_field", price_field: "close", offset: -1, timeframe: entryTf },
                operator: "GREATER_THAN",
                right: { type: "price_field", price_field: "orb_high", offset: 0 },
                description: "Candle -1 Close > ORB High",
              },
            ],
            nested_groups: [],
          },
          {
            id: "grp_call_b",
            logic: "AND",
            conditions: [
              {
                id: "rule_call_b1",
                left: { type: "price_field", price_field: "close", offset: -2, timeframe: entryTf },
                operator: "LESS_THAN",
                right: { type: "price_field", price_field: "orb_low", offset: 0 },
                description: "Candle -2 Close < ORB Low",
              },
              {
                id: "rule_call_b2",
                left: { type: "price_field", price_field: "close", offset: -1, timeframe: entryTf },
                operator: "GREATER_THAN",
                right: { type: "price_field", price_field: "orb_low", offset: 0 },
                description: "Candle -1 Close > ORB Low",
              },
            ],
            nested_groups: [],
          },
        ],
      };
    }

    if (treeKey === "put_entry_rules") {
      // Default canonical ORB PUT Entry: (A1 AND A2) OR (B1 AND B2)
      return {
        id: "grp_put_entry_root",
        logic: "OR",
        conditions: [],
        nested_groups: [
          {
            id: "grp_put_a",
            logic: "AND",
            conditions: [
              {
                id: "rule_put_a1",
                left: { type: "price_field", price_field: "close", offset: -2, timeframe: entryTf },
                operator: "GREATER_THAN",
                right: { type: "price_field", price_field: "orb_low", offset: 0 },
                description: "Candle -2 Close > ORB Low",
              },
              {
                id: "rule_put_a2",
                left: { type: "price_field", price_field: "close", offset: -1, timeframe: entryTf },
                operator: "LESS_THAN",
                right: { type: "price_field", price_field: "orb_low", offset: 0 },
                description: "Candle -1 Close < ORB Low",
              },
            ],
            nested_groups: [],
          },
          {
            id: "grp_put_b",
            logic: "AND",
            conditions: [
              {
                id: "rule_put_b1",
                left: { type: "price_field", price_field: "close", offset: -2, timeframe: entryTf },
                operator: "GREATER_THAN",
                right: { type: "price_field", price_field: "orb_high", offset: 0 },
                description: "Candle -2 Close > ORB High",
              },
              {
                id: "rule_put_b2",
                left: { type: "price_field", price_field: "close", offset: -1, timeframe: entryTf },
                operator: "LESS_THAN",
                right: { type: "price_field", price_field: "orb_high", offset: 0 },
                description: "Candle -1 Close < ORB High",
              },
            ],
            nested_groups: [],
          },
        ],
      };
    }

    if (treeKey === "call_exit_rules") {
      return {
        id: "grp_call_exit_root",
        logic: "OR",
        conditions: [],
        nested_groups: [
          {
            id: "grp_call_exit_a",
            logic: "AND",
            conditions: [
              {
                id: "rule_call_exit_1",
                left: { type: "price_field", price_field: "close", offset: -1, timeframe: exitTf },
                operator: "LESS_THAN",
                right: { type: "price_field", price_field: "orb_midpoint", offset: 0 },
                description: "Candle -1 Close < ORB Midpoint",
              },
            ],
            nested_groups: [],
          },
        ],
      };
    }

    // put_exit_rules
    return {
      id: "grp_put_exit_root",
      logic: "OR",
      conditions: [],
      nested_groups: [
        {
          id: "grp_put_exit_a",
          logic: "AND",
          conditions: [
            {
              id: "rule_put_exit_1",
              left: { type: "price_field", price_field: "close", offset: -1, timeframe: exitTf },
              operator: "GREATER_THAN",
              right: { type: "price_field", price_field: "orb_midpoint", offset: 0 },
              description: "Candle -1 Close > ORB Midpoint",
            },
          ],
          nested_groups: [],
        },
      ],
    };
  }

  function saveTree(treeKey: TreeKey, tree: ConditionGroup) {
    const patch: Partial<StrategySpec> = { [treeKey]: tree };
    if (treeKey === "call_entry_rules") {
      patch.entry_rules = tree;
    }
    updateSpec(patch);
  }

  // Group and Rule Manipulators for Tree
  function handleUpdateTreeRootLogic(treeKey: TreeKey, logic: "AND" | "OR") {
    const tree = getOrCreateTree(treeKey);
    saveTree(treeKey, { ...tree, logic });
  }

  function handleAddGroup(treeKey: TreeKey) {
    const tree = getOrCreateTree(treeKey);
    const groups = tree.nested_groups || [];
    const grpLetter = String.fromCharCode(65 + groups.length);
    const tf = treeKey.includes("exit") ? spec.exit_timeframe || "1m" : spec.entry_timeframe || "5m";

    const newGroup: ConditionGroup = {
      id: `grp_${treeKey}_${Date.now()}`,
      logic: "AND",
      conditions: [
        {
          id: `rule_${Date.now()}`,
          left: { type: "price_field", price_field: "close", offset: -1, timeframe: tf },
          operator: "GREATER_THAN",
          right: { type: "price_field", price_field: "orb_high", offset: 0 },
          description: `Group ${grpLetter} Rule`,
        },
      ],
      nested_groups: [],
    };

    saveTree(treeKey, { ...tree, nested_groups: [...groups, newGroup] });
  }

  function handleDuplicateGroup(treeKey: TreeKey, groupIndex: number) {
    const tree = getOrCreateTree(treeKey);
    const groups = [...(tree.nested_groups || [])];
    const target = groups[groupIndex];
    if (!target) return;

    const dup: ConditionGroup = {
      ...JSON.parse(JSON.stringify(target)),
      id: `grp_${treeKey}_${Date.now()}`,
      conditions: target.conditions.map((c) => ({
        ...c,
        id: `rule_${Math.random().toString(36).substring(2, 8)}`,
      })),
    };

    groups.splice(groupIndex + 1, 0, dup);
    saveTree(treeKey, { ...tree, nested_groups: groups });
  }

  function handleDeleteGroup(treeKey: TreeKey, groupIndex: number) {
    const tree = getOrCreateTree(treeKey);
    const groups = [...(tree.nested_groups || [])];
    if (groups.length <= 1) return; // Keep at least one group
    groups.splice(groupIndex, 1);
    saveTree(treeKey, { ...tree, nested_groups: groups });
  }

  function handleUpdateGroupLogic(treeKey: TreeKey, groupIndex: number, logic: "AND" | "OR") {
    const tree = getOrCreateTree(treeKey);
    const groups = [...(tree.nested_groups || [])];
    if (!groups[groupIndex]) return;
    groups[groupIndex] = { ...groups[groupIndex], logic };
    saveTree(treeKey, { ...tree, nested_groups: groups });
  }

  function handleAddRuleToGroup(treeKey: TreeKey, groupIndex: number) {
    const tree = getOrCreateTree(treeKey);
    const groups = [...(tree.nested_groups || [])];
    if (!groups[groupIndex]) return;

    const tf = treeKey.includes("exit") ? spec.exit_timeframe || "1m" : spec.entry_timeframe || "5m";
    const newRule: ConditionRule = {
      id: `rule_${Math.random().toString(36).substring(2, 8)}`,
      left: { type: "price_field", price_field: "close", offset: -1, timeframe: tf },
      operator: "GREATER_THAN",
      right: { type: "price_field", price_field: "orb_high", offset: 0 },
      description: "Additional Condition Rule",
    };

    groups[groupIndex] = {
      ...groups[groupIndex],
      conditions: [...groups[groupIndex].conditions, newRule],
    };
    saveTree(treeKey, { ...tree, nested_groups: groups });
  }

  function handleDuplicateRule(treeKey: TreeKey, groupIndex: number, ruleId: string) {
    const tree = getOrCreateTree(treeKey);
    const groups = [...(tree.nested_groups || [])];
    if (!groups[groupIndex]) return;

    const conds = [...groups[groupIndex].conditions];
    const idx = conds.findIndex((c) => c.id === ruleId);
    if (idx === -1) return;

    const dup: ConditionRule = {
      ...JSON.parse(JSON.stringify(conds[idx])),
      id: `rule_${Math.random().toString(36).substring(2, 8)}`,
      description: `${conds[idx].description || "Rule"} (Copy)`,
    };

    conds.splice(idx + 1, 0, dup);
    groups[groupIndex] = { ...groups[groupIndex], conditions: conds };
    saveTree(treeKey, { ...tree, nested_groups: groups });
  }

  function handleDeleteRule(treeKey: TreeKey, groupIndex: number, ruleId: string) {
    const tree = getOrCreateTree(treeKey);
    const groups = [...(tree.nested_groups || [])];
    if (!groups[groupIndex]) return;

    const conds = groups[groupIndex].conditions.filter((c) => c.id !== ruleId);
    if (conds.length === 0) {
      // If group has no rules left and multiple groups exist, delete group
      if (groups.length > 1) {
        groups.splice(groupIndex, 1);
      } else {
        return; // Preserve at least one rule
      }
    } else {
      groups[groupIndex] = { ...groups[groupIndex], conditions: conds };
    }
    saveTree(treeKey, { ...tree, nested_groups: groups });
  }

  function handleUpdateRule(
    treeKey: TreeKey,
    groupIndex: number,
    ruleId: string,
    patch: Partial<ConditionRule>
  ) {
    const tree = getOrCreateTree(treeKey);
    const groups = [...(tree.nested_groups || [])];
    if (!groups[groupIndex]) return;

    const conds = groups[groupIndex].conditions.map((c) => {
      if (c.id === ruleId) {
        return { ...c, ...patch };
      }
      return c;
    });

    groups[groupIndex] = { ...groups[groupIndex], conditions: conds };
    saveTree(treeKey, { ...tree, nested_groups: groups });
  }

  // Quick Preset Helper for ORB
  function handleSelectOrbPreset(windowStr: "15m" | "30m" | "45m") {
    let rStart = "09:15";
    let rEnd = "09:30";
    let eStart = "09:30";

    if (windowStr === "30m") {
      rEnd = "09:45";
      eStart = "09:45";
    } else if (windowStr === "45m") {
      rEnd = "10:00";
      eStart = "10:00";
    }

    updateSpec({
      orb_settings: {
        ...(spec.orb_settings as ORBSettingsSpec),
        range_start_time: rStart,
        range_end_time: rEnd,
        entry_start_time: eStart,
      },
    });
  }

  // Render Multi-Group Condition Tree
  function renderConditionTree(
    treeKey: TreeKey,
    title: string,
    badgeColor: string,
    badgeText: string,
    icon: React.ReactNode
  ) {
    const tree = getOrCreateTree(treeKey);
    const groups = tree.nested_groups || [];
    const defaultTf = treeKey.includes("exit") ? spec.exit_timeframe || "1m" : spec.entry_timeframe || "5m";

    // Plain English equation
    const formulaStr = groups
      .map((g, gIdx) => {
        const letter = String.fromCharCode(65 + gIdx);
        const rulesStr = g.conditions
          .map((c, rIdx) => {
            const leftStr = `${c.left.offset ?? -1} ${c.left.price_field || "Close"}`;
            const rightStr = c.right.type === "constant" ? `${c.right.constant_value}` : `${c.right.price_field || "Level"}`;
            return `${letter}${rIdx + 1}: ${leftStr} ${c.operator} ${rightStr}`;
          })
          .join(` ${g.logic} `);
        return `(${rulesStr})`;
      })
      .join(` ${tree.logic} `);

    return (
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${badgeColor}`} />
              <h4 className="text-xs font-bold text-[var(--text)] tracking-tight flex items-center gap-1.5">
                {icon}
                <span>{title}</span>
              </h4>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] font-semibold text-[var(--text-muted)]">
                {badgeText}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Nested condition groups: Independent groups evaluated with {tree.logic} relationship.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[var(--bg)] px-2.5 py-1 rounded-lg border border-[var(--border)] text-xs">
              <span className="text-[11px] font-bold text-[var(--text-muted)]">Relationship Between Groups:</span>
              <select
                value={tree.logic}
                onChange={(e) => handleUpdateTreeRootLogic(treeKey, e.target.value as "AND" | "OR")}
                className="bg-transparent text-xs font-black text-[#FF7722] outline-none cursor-pointer"
              >
                <option value="OR">OR (Any group can trigger)</option>
                <option value="AND">AND (All groups must match)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleAddGroup(treeKey)}
              className="px-2.5 py-1 rounded-lg bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Group</span>
            </button>
          </div>
        </div>

        {/* Groups Stream */}
        <div className="space-y-4">
          {groups.map((group, gIdx) => {
            const grpLetter = String.fromCharCode(65 + gIdx);

            return (
              <div
                key={group.id || gIdx}
                className="rounded-2xl bg-[var(--bg)] border-2 border-[var(--border)] overflow-hidden shadow-sm space-y-0"
              >
                {/* Group Header */}
                <div className="p-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#FF7722]/15 text-[#FF7722] font-black text-xs flex items-center justify-center border border-[#FF7722]/30">
                      {grpLetter}
                    </span>
                    <span className="text-xs font-bold text-[var(--text)]">
                      Group {grpLetter} Rules ({group.conditions.length})
                    </span>

                    <div className="flex items-center gap-1 text-[11px] ml-2">
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">Inside Group:</span>
                      <select
                        value={group.logic}
                        onChange={(e) => handleUpdateGroupLogic(treeKey, gIdx, e.target.value as "AND" | "OR")}
                        className="bg-[var(--bg)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[10px] font-bold text-[#FF7722] outline-none"
                      >
                        <option value="AND">AND (All rules must match)</option>
                        <option value="OR">OR (Any rule can match)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAddRuleToGroup(treeKey, gIdx)}
                      className="px-2 py-0.5 rounded-md bg-[var(--bg)] hover:border-[#FF7722] text-[#FF7722] border border-[var(--border)] text-[10px] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Rule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateGroup(treeKey, gIdx)}
                      title="Duplicate Group"
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {groups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(treeKey, gIdx)}
                        title="Delete Group"
                        className="p-1 rounded text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Group Conditions List */}
                <div className="p-3 space-y-2.5">
                  {group.conditions.map((rule, rIdx) => (
                    <div
                      key={rule.id || rIdx}
                      className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#FF7722] uppercase tracking-wider">
                          Rule {grpLetter}{rIdx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRule(treeKey, gIdx, rule.id)}
                            title="Duplicate Rule"
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)]"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(treeKey, gIdx, rule.id)}
                            title="Delete Rule"
                            className="p-1 rounded text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Rule Row: Left Operand, Operator, Right Operand */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        {/* Left Operand: Timeframe, Candle Reference, Price Source */}
                        <div className="sm:col-span-5 space-y-1">
                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={rule.left.timeframe || defaultTf}
                              onChange={(e) =>
                                handleUpdateRule(treeKey, gIdx, rule.id, {
                                  left: { ...rule.left, timeframe: e.target.value },
                                })
                              }
                              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--text)] outline-none"
                            >
                              {SUPPORTED_TIMEFRAMES.map((tf) => (
                                <option key={tf} value={tf}>
                                  {tf} bar
                                </option>
                              ))}
                            </select>

                            <select
                              value={rule.left.offset ?? -1}
                              onChange={(e) =>
                                handleUpdateRule(treeKey, gIdx, rule.id, {
                                  left: { ...rule.left, offset: parseInt(e.target.value, 10) },
                                })
                              }
                              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--text)] outline-none"
                            >
                              {CANDLE_REFERENCES.map((cr) => (
                                <option key={cr.value} value={cr.value}>
                                  {cr.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <select
                            value={rule.left.price_field || (rule.left.type === "indicator" ? rule.left.indicator_type : "close")}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (["EMA", "SMA", "RSI", "SUPERTREND", "VWAP"].includes(val)) {
                                handleUpdateRule(treeKey, gIdx, rule.id, {
                                  left: { ...rule.left, type: "indicator", indicator_type: val as any, price_field: undefined },
                                });
                              } else {
                                handleUpdateRule(treeKey, gIdx, rule.id, {
                                  left: { ...rule.left, type: "price_field", price_field: val as any },
                                });
                              }
                            }}
                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] font-bold text-[var(--text)] outline-none"
                          >
                            <optgroup label="Price & Dynamic ORB Levels">
                              {PRICE_SOURCES.map((ps) => (
                                <option key={ps.value} value={ps.value}>
                                  {ps.label}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Indicators">
                              <option value="EMA">EMA Output</option>
                              <option value="SMA">SMA Output</option>
                              <option value="RSI">RSI Output</option>
                              <option value="SUPERTREND">Supertrend Line</option>
                              <option value="VWAP">VWAP Anchor</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* Operator */}
                        <div className="sm:col-span-2">
                          <select
                            value={rule.operator}
                            onChange={(e) => handleUpdateRule(treeKey, gIdx, rule.id, { operator: e.target.value })}
                            className="w-full bg-[var(--bg)] border border-[#FF7722]/50 rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#FF7722] outline-none"
                          >
                            {COMPARISON_OPERATORS.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Right Operand */}
                        <div className="sm:col-span-5 space-y-1">
                          <div className="grid grid-cols-2 gap-1.5">
                            <select
                              value={rule.right.type}
                              onChange={(e) => {
                                const t = e.target.value as any;
                                handleUpdateRule(treeKey, gIdx, rule.id, {
                                  right: { ...rule.right, type: t },
                                });
                              }}
                              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--text)] outline-none"
                            >
                              <option value="price_field">Price / ORB Field</option>
                              <option value="constant">Constant Value</option>
                              <option value="indicator">Indicator Output</option>
                            </select>

                            {rule.right.type === "constant" ? (
                              <input
                                type="number"
                                step="0.5"
                                value={rule.right.constant_value ?? 50.0}
                                onChange={(e) =>
                                  handleUpdateRule(treeKey, gIdx, rule.id, {
                                    right: { ...rule.right, constant_value: parseFloat(e.target.value) || 0.0 },
                                  })
                                }
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-[var(--text)] outline-none"
                              />
                            ) : rule.right.type === "price_field" ? (
                              <select
                                value={rule.right.price_field || "orb_high"}
                                onChange={(e) =>
                                  handleUpdateRule(treeKey, gIdx, rule.id, {
                                    right: { ...rule.right, price_field: e.target.value as any },
                                  })
                                }
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] font-bold text-[var(--text)] outline-none"
                              >
                                {PRICE_SOURCES.map((ps) => (
                                  <option key={ps.value} value={ps.value}>
                                    {ps.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={rule.right.indicator_type || "EMA"}
                                onChange={(e) =>
                                  handleUpdateRule(treeKey, gIdx, rule.id, {
                                    right: { ...rule.right, indicator_type: e.target.value as any },
                                  })
                                }
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11px] font-bold text-[var(--text)] outline-none"
                              >
                                <option value="EMA">EMA(21)</option>
                                <option value="SMA">SMA(50)</option>
                                <option value="SUPERTREND">Supertrend</option>
                                <option value="VWAP">VWAP</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Operator divider between groups if not last */}
                {gIdx < groups.length - 1 && (
                  <div className="py-1 px-4 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7722] bg-[var(--bg)] px-2 py-0.5 rounded border border-[var(--border)]">
                      {tree.logic}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Visual Logic Blueprint Box */}
        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text)]">
            <Binary className="w-3.5 h-3.5 text-[#FF7722]" />
            <span>Mathematical AST Representation:</span>
          </div>
          <div className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg)] p-2 rounded-lg border border-[var(--border)] leading-relaxed">
            {formulaStr || "No condition rules configured."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div className="p-4 border-b border-[var(--border)] space-y-3 bg-[var(--bg)]/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text)] tracking-tight">Strategy Rule Builder</h3>
              <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                {spec.name} • {spec.exchange}:{spec.symbol}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold text-[10px]">
              {spec.trading_mode || "INTRADAY"}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30 font-semibold text-[10px]">
              Entry {spec.entry_timeframe || spec.timeframe} / Exit {spec.exit_timeframe || "1m"}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-lg bg-[var(--surface)] p-1 border border-[var(--border)] text-xs overflow-x-auto max-w-full gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all ${
              activeTab === "overview"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Overview
          </button>

          {(isOrb || spec.orb_settings?.enabled) && (
            <button
              onClick={() => setActiveTab("orb")}
              className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all flex items-center gap-1 ${
                activeTab === "orb"
                  ? "bg-[#FF7722] text-white shadow-sm"
                  : "text-[#FF7722] hover:bg-[#FF7722]/10"
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>ORB ({spec.orb_settings?.range_start_time || "09:15"}-{spec.orb_settings?.range_end_time || "09:30"})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("call_entry")}
            className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === "call_entry"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>CALL Entry</span>
          </button>

          <button
            onClick={() => setActiveTab("put_entry")}
            className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all flex items-center gap-1 ${
              activeTab === "put_entry"
                ? "bg-red-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <ArrowDownRight className="w-3 h-3 text-red-400" />
            <span>PUT Entry</span>
          </button>

          <button
            onClick={() => setActiveTab("call_exit")}
            className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all ${
              activeTab === "call_exit"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            CALL Exit
          </button>

          <button
            onClick={() => setActiveTab("put_exit")}
            className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all ${
              activeTab === "put_exit"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            PUT Exit
          </button>

          <button
            onClick={() => setActiveTab("stop_targets")}
            className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all ${
              activeTab === "stop_targets"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            SL & Targets
          </button>

          <button
            onClick={() => setActiveTab("tsl")}
            className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all ${
              activeTab === "tsl"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            TSL
          </button>

          <button
            onClick={() => setActiveTab("risk")}
            className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all ${
              activeTab === "risk"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Risk
          </button>

          <button
            onClick={() => setActiveTab("summary")}
            className={`px-2.5 py-1 font-semibold rounded-md whitespace-nowrap transition-all ${
              activeTab === "summary"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Logic
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ========================================================= */}
        {/* TAB: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Strategy Name
                </label>
                <input
                  type="text"
                  value={spec.name}
                  onChange={(e) => updateSpec({ name: e.target.value })}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Instrument / Symbol
                </label>
                <select
                  value={spec.symbol}
                  onChange={(e) => {
                    const sym = e.target.value;
                    const exch = ["CRUDEOIL", "GOLDM", "SILVERM", "NATURALGAS"].includes(sym) ? "MCX" : "NSE";
                    updateSpec({ symbol: sym, exchange: exch });
                  }}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="NIFTY50">NSE: NIFTY 50 Index</option>
                  <option value="BANKNIFTY">NSE: BANKNIFTY Index</option>
                  <option value="FINNIFTY">NSE: FINNIFTY Index</option>
                  <option value="RELIANCE">NSE: RELIANCE Ind.</option>
                  <option value="TCS">NSE: TCS Ltd.</option>
                  <option value="INFY">NSE: INFY Ltd.</option>
                  <option value="CRUDEOIL">MCX: CRUDEOIL Futures</option>
                  <option value="GOLDM">MCX: GOLD Mini Futures</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Trading Mode
                </label>
                <select
                  value={spec.trading_mode || "INTRADAY"}
                  onChange={(e) => {
                    const m = e.target.value as "INTRADAY" | "BTST";
                    updateSpec({
                      trading_mode: m,
                      btst_settings: {
                        ...(spec.btst_settings || {
                          entry_window_start: "15:00",
                          entry_window_end: "15:25",
                          next_session_exit_start: "09:15",
                          next_session_exit_cutoff: "09:30",
                          squareoff_on_gap_breach: true,
                        }),
                        enabled: m === "BTST",
                        gap_risk_acknowledged: true,
                      },
                      exit_rules: {
                        ...spec.exit_rules,
                        intraday_auto_squareoff: m === "BTST" ? "OVERNIGHT_BTST" : "15:15 IST",
                      },
                    });
                  }}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="INTRADAY">Intraday MIS (Mandatory 15:15 IST Square-off)</option>
                  <option value="BTST">BTST (Buy Today, Sell Tomorrow — Overnight Carry)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Trading Direction
                </label>
                <select
                  value={spec.direction || "BOTH"}
                  onChange={(e) => updateSpec({ direction: e.target.value as "LONG" | "SHORT" | "BOTH" })}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="BOTH">Both (CALL and PUT)</option>
                  <option value="LONG">Long-Only (CALL breakout only)</option>
                  <option value="SHORT">Short-Only (PUT breakdown only)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Entry Evaluation Timeframe
                </label>
                <select
                  value={spec.entry_timeframe || spec.timeframe}
                  onChange={(e) => updateSpec({ entry_timeframe: e.target.value, timeframe: e.target.value })}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  {SUPPORTED_TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf} Candlestick Bar
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Exit Evaluation Timeframe (Independent)
                </label>
                <select
                  value={spec.exit_timeframe || "1m"}
                  onChange={(e) => updateSpec({ exit_timeframe: e.target.value })}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  {SUPPORTED_TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf} Candlestick Bar
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Special Modules Toggles */}
            <div className="pt-3 border-t border-[var(--border)] space-y-2">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                Specialized Modules
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !spec.orb_settings?.enabled;
                    updateSpec({
                      category: next ? "ORB" : spec.category,
                      orb_settings: {
                        ...(spec.orb_settings || {
                          range_start_time: "09:15",
                          range_end_time: "09:30",
                          entry_start_time: "09:30",
                          entry_cutoff_time: "14:30",
                          calculation_timeframe: "15m",
                          first_candle_timeframe: "3m",
                          confirmation_method: "CANDLE_CLOSE",
                          breakout_buffer_pct: 0.0,
                          one_entry_per_breakout: true,
                          max_entries_per_session: 2,
                          range_basis: "HIGH_LOW",
                          allow_opposite_side_reentry: false,
                        }),
                        enabled: next,
                      },
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    spec.orb_settings?.enabled
                      ? "bg-[#FF7722]/15 border-[#FF7722] text-[#FF7722]"
                      : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Opening Range Breakout (ORB)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !spec.tsl_settings?.enabled;
                    updateSpec({
                      tsl_settings: {
                        ...(spec.tsl_settings || {
                          activation_type: "POINTS",
                          activation_value: 20.0,
                          distance_type: "POINTS",
                          distance_value: 10.0,
                          update_timeframe: spec.exit_timeframe || "1m",
                          evaluation_candle_offset: -1,
                          lock_profit_at_activation: true,
                        }),
                        enabled: next,
                      },
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    spec.tsl_settings?.enabled
                      ? "bg-[#FF7722]/15 border-[#FF7722] text-[#FF7722]"
                      : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Trailing Stop-Loss (TSL) Engine</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: OPENING RANGE BREAKOUT (ORB) SETTINGS */}
        {/* ========================================================= */}
        {activeTab === "orb" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#FF7722]/10 border border-[#FF7722]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#FF7722] block">
                  Opening Range Breakout (ORB) Engine
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Establishes deterministic high/low boundaries during opening sessions.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectOrbPreset("15m")}
                  className="px-2 py-1 rounded bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] text-[10px] font-bold text-[var(--text)]"
                >
                  15m (09:15-09:30)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectOrbPreset("30m")}
                  className="px-2 py-1 rounded bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] text-[10px] font-bold text-[var(--text)]"
                >
                  30m (09:15-09:45)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectOrbPreset("45m")}
                  className="px-2 py-1 rounded bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] text-[10px] font-bold text-[var(--text)]"
                >
                  45m (09:15-10:00)
                </button>
              </div>
            </div>

            {/* Dynamic Reference Levels Callout */}
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs space-y-1.5">
              <span className="text-[11px] font-bold text-[var(--text)] flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-[#FF7722]" />
                <span>Explicit Dynamic Reference Levels Supported:</span>
              </span>
              <ul className="text-[10px] text-[var(--text-muted)] list-disc pl-4 space-y-0.5">
                <li><strong>First ORB Candle High/Low:</strong> High/Low of first completed candle ({spec.orb_settings?.first_candle_timeframe || "3m"}).</li>
                <li><strong>Opening Range Window High/Low:</strong> Extreme High/Low across {spec.orb_settings?.range_start_time || "09:15"} to {spec.orb_settings?.range_end_time || "09:30"}.</li>
                <li><strong>Opening Range Midpoint:</strong> (ORB High + ORB Low) / 2.</li>
                <li><strong>Determinism Rule:</strong> Engine blocks entry before opening range completion time ({spec.orb_settings?.range_end_time || "09:30"}).</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Range Start Time (HH:MM)
                </label>
                <input
                  type="text"
                  value={spec.orb_settings?.range_start_time || "09:15"}
                  onChange={(e) =>
                    updateSpec({
                      orb_settings: {
                        ...(spec.orb_settings as ORBSettingsSpec),
                        range_start_time: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Range End Time (HH:MM)
                </label>
                <input
                  type="text"
                  value={spec.orb_settings?.range_end_time || "09:30"}
                  onChange={(e) =>
                    updateSpec({
                      orb_settings: {
                        ...(spec.orb_settings as ORBSettingsSpec),
                        range_end_time: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Entry Start Time (Post-Range)
                </label>
                <input
                  type="text"
                  value={spec.orb_settings?.entry_start_time || "09:30"}
                  onChange={(e) =>
                    updateSpec({
                      orb_settings: {
                        ...(spec.orb_settings as ORBSettingsSpec),
                        entry_start_time: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Entry Cutoff Time (HH:MM)
                </label>
                <input
                  type="text"
                  value={spec.orb_settings?.entry_cutoff_time || "14:30"}
                  onChange={(e) =>
                    updateSpec({
                      orb_settings: {
                        ...(spec.orb_settings as ORBSettingsSpec),
                        entry_cutoff_time: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  First Candle Reference Timeframe
                </label>
                <select
                  value={spec.orb_settings?.first_candle_timeframe || "3m"}
                  onChange={(e) =>
                    updateSpec({
                      orb_settings: {
                        ...(spec.orb_settings as ORBSettingsSpec),
                        first_candle_timeframe: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="1m">1-minute first candle</option>
                  <option value="2m">2-minute first candle</option>
                  <option value="3m">3-minute first candle (Standard)</option>
                  <option value="5m">5-minute first candle</option>
                  <option value="15m">15-minute full range</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Breakout Confirmation Method
                </label>
                <select
                  value={spec.orb_settings?.confirmation_method || "CANDLE_CLOSE"}
                  onChange={(e) =>
                    updateSpec({
                      orb_settings: {
                        ...(spec.orb_settings as ORBSettingsSpec),
                        confirmation_method: e.target.value as any,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="CANDLE_CLOSE">Candle Close Beyond ORB Level (Recommended)</option>
                  <option value="HIGH_LOW_PENETRATION">High/Low Penetration (Intrabar Tick Touch)</option>
                  <option value="RETEST_CONFIRMATION">Retest Confirmation (Bounce after breakout)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Breakout Buffer (%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={spec.orb_settings?.breakout_buffer_pct || 0.0}
                  onChange={(e) =>
                    updateSpec({
                      orb_settings: {
                        ...(spec.orb_settings as ORBSettingsSpec),
                        breakout_buffer_pct: parseFloat(e.target.value) || 0.0,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Max Entries Per Session
                </label>
                <input
                  type="number"
                  value={spec.orb_settings?.max_entries_per_session || 2}
                  onChange={(e) =>
                    updateSpec({
                      orb_settings: {
                        ...(spec.orb_settings as ORBSettingsSpec),
                        max_entries_per_session: parseInt(e.target.value, 10) || 1,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: CALL ENTRY (NESTED CONDITION GROUPS) */}
        {/* ========================================================= */}
        {activeTab === "call_entry" &&
          renderConditionTree(
            "call_entry_rules",
            "CALL Entry Rules",
            "bg-emerald-500",
            "Long Breakouts",
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          )}

        {/* ========================================================= */}
        {/* TAB: PUT ENTRY (NESTED CONDITION GROUPS) */}
        {/* ========================================================= */}
        {activeTab === "put_entry" &&
          renderConditionTree(
            "put_entry_rules",
            "PUT Entry Rules",
            "bg-red-500",
            "Short Breakdowns",
            <ArrowDownRight className="w-4 h-4 text-red-400" />
          )}

        {/* ========================================================= */}
        {/* TAB: CALL EXIT RULES */}
        {/* ========================================================= */}
        {activeTab === "call_exit" &&
          renderConditionTree(
            "call_exit_rules",
            "CALL Position Exit Rules",
            "bg-amber-500",
            "CALL Exits",
            <Crosshair className="w-4 h-4 text-amber-400" />
          )}

        {/* ========================================================= */}
        {/* TAB: PUT EXIT RULES */}
        {/* ========================================================= */}
        {activeTab === "put_exit" &&
          renderConditionTree(
            "put_exit_rules",
            "PUT Position Exit Rules",
            "bg-blue-500",
            "PUT Exits",
            <Crosshair className="w-4 h-4 text-blue-400" />
          )}

        {/* ========================================================= */}
        {/* TAB: STOP-LOSS & TARGETS */}
        {/* ========================================================= */}
        {activeTab === "stop_targets" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Stop Loss Method
                </label>
                <select
                  value={spec.exit_rules.stop_loss_method || "PERCENTAGE"}
                  onChange={(e) =>
                    updateSpec({
                      exit_rules: {
                        ...spec.exit_rules,
                        stop_loss_method: e.target.value as any,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="PERCENTAGE">Percentage Stop Loss</option>
                  <option value="FIXED_POINTS">Fixed Points Stop</option>
                  <option value="ATR_BASED">ATR Volatility Stop</option>
                  <option value="ORB_BASED">ORB Level Stop</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Stop Loss Value (% / Points)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={spec.exit_rules.stop_loss_pct ?? spec.exit_rules.stop_loss_points ?? 0.65}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0.5;
                    updateSpec({
                      exit_rules: {
                        ...spec.exit_rules,
                        stop_loss_pct: val,
                        stop_loss_points: val,
                      },
                    });
                  }}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Profit Target Method
                </label>
                <select
                  value={spec.exit_rules.profit_target_method || "PERCENTAGE"}
                  onChange={(e) =>
                    updateSpec({
                      exit_rules: {
                        ...spec.exit_rules,
                        profit_target_method: e.target.value as any,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="PERCENTAGE">Percentage Target</option>
                  <option value="FIXED_POINTS">Fixed Points Target</option>
                  <option value="RISK_REWARD_MULTIPLE">Risk/Reward Multiple</option>
                  <option value="ORB_RANGE_MULTIPLE">ORB Range Multiple</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Target Value (% / Points / R)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={spec.exit_rules.target_profit_pct ?? 1.5}
                  onChange={(e) =>
                    updateSpec({
                      exit_rules: {
                        ...spec.exit_rules,
                        target_profit_pct: parseFloat(e.target.value) || 1.0,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: TRAILING STOP-LOSS (TSL) */}
        {/* ========================================================= */}
        {activeTab === "tsl" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text)] block">
                  Trailing Stop-Loss (TSL) Engine
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Dynamically locks in gains as trade reaches profit thresholds. Never widens risk.
                </span>
              </div>
              <input
                type="checkbox"
                checked={spec.tsl_settings?.enabled ?? false}
                onChange={(e) =>
                  updateSpec({
                    tsl_settings: {
                      ...(spec.tsl_settings || {
                        activation_type: "POINTS",
                        activation_value: 20.0,
                        distance_type: "POINTS",
                        distance_value: 10.0,
                        update_timeframe: "1m",
                        evaluation_candle_offset: -1,
                        lock_profit_at_activation: true,
                      }),
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-[#FF7722] rounded cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Activation Threshold (Points / %)
                </label>
                <input
                  type="number"
                  step="1"
                  value={spec.tsl_settings?.activation_value || 20.0}
                  onChange={(e) =>
                    updateSpec({
                      tsl_settings: {
                        ...(spec.tsl_settings as TSLSettingsSpec),
                        activation_value: parseFloat(e.target.value) || 10.0,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Trailing Distance (Points / %)
                </label>
                <input
                  type="number"
                  step="1"
                  value={spec.tsl_settings?.distance_value || 10.0}
                  onChange={(e) =>
                    updateSpec({
                      tsl_settings: {
                        ...(spec.tsl_settings as TSLSettingsSpec),
                        distance_value: parseFloat(e.target.value) || 5.0,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Update Evaluation Timeframe
                </label>
                <select
                  value={spec.tsl_settings?.update_timeframe || "1m"}
                  onChange={(e) =>
                    updateSpec({
                      tsl_settings: {
                        ...(spec.tsl_settings as TSLSettingsSpec),
                        update_timeframe: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="1m">1-minute completed bar</option>
                  <option value="3m">3-minute completed bar</option>
                  <option value="5m">5-minute completed bar</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Lock Profit At Activation
                </label>
                <select
                  value={spec.tsl_settings?.lock_profit_at_activation ? "YES" : "NO"}
                  onChange={(e) =>
                    updateSpec({
                      tsl_settings: {
                        ...(spec.tsl_settings as TSLSettingsSpec),
                        lock_profit_at_activation: e.target.value === "YES",
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="YES">Yes (Monotonically lock break-even/profit)</option>
                  <option value="NO">No (Trail standard distance)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: RISK MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === "risk" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Daily Loss Circuit Limit (₹)
                </label>
                <input
                  type="number"
                  value={spec.risk_limits.daily_loss_limit_inr}
                  onChange={(e) =>
                    updateSpec({
                      risk_limits: {
                        ...spec.risk_limits,
                        daily_loss_limit_inr: parseFloat(e.target.value) || 10000.0,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Max Open Positions
                </label>
                <input
                  type="number"
                  value={spec.risk_limits.max_open_positions}
                  onChange={(e) =>
                    updateSpec({
                      risk_limits: {
                        ...spec.risk_limits,
                        max_open_positions: parseInt(e.target.value, 10) || 1,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Prevent Duplicate Signal Entries
                </label>
                <select
                  value={spec.risk_limits.prevent_duplicate_entries ? "TRUE" : "FALSE"}
                  onChange={(e) =>
                    updateSpec({
                      risk_limits: {
                        ...spec.risk_limits,
                        prevent_duplicate_entries: e.target.value === "TRUE",
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                >
                  <option value="TRUE">Enabled (One trade at a time)</option>
                  <option value="FALSE">Disabled (Pyramiding allowed)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                  Mandatory Auto Square-off Time
                </label>
                <input
                  type="text"
                  value={spec.exit_rules.intraday_auto_squareoff}
                  onChange={(e) =>
                    updateSpec({
                      exit_rules: {
                        ...spec.exit_rules,
                        intraday_auto_squareoff: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[var(--text)] focus:border-[#FF7722] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: PLAIN-ENGLISH LOGIC SUMMARY */}
        {/* ========================================================= */}
        {activeTab === "summary" && (
          <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
            <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#FF7722]" />
              <span>Canonical Strategy Execution Blueprint</span>
            </span>

            <div className="space-y-2 text-[11px] text-[var(--text-muted)] leading-relaxed font-mono">
              <p>• Instrument: {spec.exchange}:{spec.symbol} ({spec.trading_mode || "INTRADAY"})</p>
              <p>• Entry Timeframe: {spec.entry_timeframe || spec.timeframe} • Exit Timeframe: {spec.exit_timeframe || "1m"}</p>
              {isOrb && (
                <p>
                  • ORB Window: {spec.orb_settings?.range_start_time} to {spec.orb_settings?.range_end_time} IST
                  (First Candle: {spec.orb_settings?.first_candle_timeframe || "3m"}, Calculation: {spec.orb_settings?.calculation_timeframe}, Confirmation: {spec.orb_settings?.confirmation_method})
                </p>
              )}
              <p className="text-[var(--text)] font-bold pt-1">CALL Entry Logic:</p>
              <p className="pl-3 text-emerald-500 font-mono">
                {spec.call_entry_rules?.nested_groups?.map((g, idx) => `Group ${String.fromCharCode(65 + idx)} (${g.conditions.map(c => `${c.left.offset} ${c.left.price_field} ${c.operator} ${c.right.price_field || c.right.constant_value}`).join(` ${g.logic} `)})`).join(` ${spec.call_entry_rules.logic} `) || "Default Canonical (A AND B) OR (C AND D)"}
              </p>

              <p className="text-[var(--text)] font-bold pt-1">PUT Entry Logic:</p>
              <p className="pl-3 text-red-500 font-mono">
                {spec.put_entry_rules?.nested_groups?.map((g, idx) => `Group ${String.fromCharCode(65 + idx)} (${g.conditions.map(c => `${c.left.offset} ${c.left.price_field} ${c.operator} ${c.right.price_field || c.right.constant_value}`).join(` ${g.logic} `)})`).join(` ${spec.put_entry_rules.logic} `) || "Inverse Canonical (A AND B) OR (C AND D)"}
              </p>

              <p className="text-[var(--text)] font-bold pt-1">Risk & Precedence Controls:</p>
              <p className="pl-3">• Stop Loss: {spec.exit_rules.stop_loss_pct || 0.75}% • Target: {spec.exit_rules.target_profit_pct || 1.75}%</p>
              {spec.tsl_settings?.enabled && (
                <p className="pl-3">
                  • Trailing Stop (TSL): Activate at +{spec.tsl_settings.activation_value} pts, trail by {spec.tsl_settings.distance_value} pts
                </p>
              )}
              <p className="pl-3">• Precedence: Hard SL {">"} Target {">"} TSL {">"} Condition Exit {">"} Auto Square-off ({spec.exit_rules.intraday_auto_squareoff})</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
