"use client";

import React, { useState } from "react";
import {
  ConditionGroup,
  ConditionRule,
  StrategySpec,
} from "../../lib/api";
import {
  GitFork,
  Compass,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Target,
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { SelectedNodeType, PaletteBlockItem } from "./types";

interface CanvasLogicTreeProps {
  spec: StrategySpec;
  selectedNode: SelectedNodeType | null;
  onSelectNode: (node: SelectedNodeType) => void;
  onUpdateSpec: (updatedSpec: StrategySpec) => void;
  activeDirection: "CALL" | "PUT";
  onChangeDirection: (dir: "CALL" | "PUT") => void;
  onDropPaletteBlock: (targetGroupId: string, block: PaletteBlockItem) => void;
}

export function CanvasLogicTree({
  spec,
  selectedNode,
  onSelectNode,
  onUpdateSpec,
  activeDirection,
  onChangeDirection,
  onDropPaletteBlock,
}: CanvasLogicTreeProps) {
  const [activeSection, setActiveSection] = useState<"entry" | "exit">("entry");
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const entryTreeKey = activeDirection === "CALL" ? "call_entry_rules" : "put_entry_rules";
  const exitTreeKey = activeDirection === "CALL" ? "call_exit_rules" : "put_exit_rules";
  const activeTreeKey = activeSection === "entry" ? entryTreeKey : exitTreeKey;

  const currentTree: ConditionGroup = (spec as any)[activeTreeKey] || {
    id: `grp_${activeTreeKey}_root`,
    logic: "OR",
    conditions: [],
    nested_groups: [],
  };

  const groups = currentTree.nested_groups || [];

  // Helper to persist updated tree to spec
  function saveTree(newTree: ConditionGroup) {
    onUpdateSpec({
      ...spec,
      [activeTreeKey]: newTree,
    });
  }

  // Group Operations
  function handleAddGroup() {
    const newGroup: ConditionGroup = {
      id: `grp_${Date.now()}`,
      logic: "AND",
      conditions: [
        {
          id: `rule_${Date.now()}`,
          left: {
            type: "price_field",
            price_field: "close",
            offset: -1,
            timeframe: spec.entry_timeframe,
          },
          operator: "GREATER_THAN",
          right: {
            type: "price_field",
            price_field: "orb_high",
            offset: 0,
          },
          description: "Candle -1 Close > ORB High",
        },
      ],
      nested_groups: [],
    };
    saveTree({
      ...currentTree,
      nested_groups: [...groups, newGroup],
    });
  }

  function handleDuplicateGroup(grpIdx: number) {
    const target = groups[grpIdx];
    if (!target) return;
    const cloned: ConditionGroup = {
      ...JSON.parse(JSON.stringify(target)),
      id: `grp_${Date.now()}`,
    };
    const nextGroups = [...groups];
    nextGroups.splice(grpIdx + 1, 0, cloned);
    saveTree({ ...currentTree, nested_groups: nextGroups });
  }

  function handleDeleteGroup(grpIdx: number) {
    if (groups.length <= 1) {
      alert("At least one condition group must remain in the tree.");
      return;
    }
    const nextGroups = groups.filter((_, idx) => idx !== grpIdx);
    saveTree({ ...currentTree, nested_groups: nextGroups });
  }

  function handleToggleGroupLogic(grpIdx: number) {
    const nextGroups = [...groups];
    nextGroups[grpIdx] = {
      ...nextGroups[grpIdx],
      logic: nextGroups[grpIdx].logic === "AND" ? "OR" : "AND",
    };
    saveTree({ ...currentTree, nested_groups: nextGroups });
  }

  function handleToggleRootLogic() {
    saveTree({
      ...currentTree,
      logic: currentTree.logic === "OR" ? "AND" : "OR",
    });
  }

  // Rule Operations
  function handleAddRule(grpIdx: number) {
    const nextGroups = [...groups];
    const grp = nextGroups[grpIdx];
    const newRule: ConditionRule = {
      id: `rule_${Date.now()}`,
      left: {
        type: "price_field",
        price_field: "close",
        offset: -1,
        timeframe: spec.entry_timeframe,
      },
      operator: "GREATER_THAN",
      right: {
        type: "price_field",
        price_field: "orb_high",
        offset: 0,
      },
      description: "Candle -1 Close > ORB High",
    };
    grp.conditions = [...grp.conditions, newRule];
    saveTree({ ...currentTree, nested_groups: nextGroups });
  }

  function handleDuplicateRule(grpIdx: number, ruleIdx: number) {
    const nextGroups = [...groups];
    const grp = nextGroups[grpIdx];
    const rule = grp.conditions[ruleIdx];
    const clonedRule: ConditionRule = {
      ...JSON.parse(JSON.stringify(rule)),
      id: `rule_${Date.now()}`,
    };
    grp.conditions.splice(ruleIdx + 1, 0, clonedRule);
    saveTree({ ...currentTree, nested_groups: nextGroups });
  }

  function handleDeleteRule(grpIdx: number, ruleIdx: number) {
    const nextGroups = [...groups];
    const grp = nextGroups[grpIdx];
    if (grp.conditions.length <= 1) {
      alert("Each condition group must contain at least one rule.");
      return;
    }
    grp.conditions = grp.conditions.filter((_, idx) => idx !== ruleIdx);
    saveTree({ ...currentTree, nested_groups: nextGroups });
  }

  function handleMoveRule(grpIdx: number, ruleIdx: number, direction: "up" | "down") {
    const nextGroups = [...groups];
    const grp = nextGroups[grpIdx];
    const targetIdx = direction === "up" ? ruleIdx - 1 : ruleIdx + 1;
    if (targetIdx < 0 || targetIdx >= grp.conditions.length) return;
    const temp = grp.conditions[ruleIdx];
    grp.conditions[ruleIdx] = grp.conditions[targetIdx];
    grp.conditions[targetIdx] = temp;
    saveTree({ ...currentTree, nested_groups: nextGroups });
  }

  function handleMoveRuleToGroup(srcGrpIdx: number, ruleIdx: number, destGrpIdx: number) {
    if (srcGrpIdx === destGrpIdx) return;
    const nextGroups = [...groups];
    const srcGrp = nextGroups[srcGrpIdx];
    const destGrp = nextGroups[destGrpIdx];
    if (srcGrp.conditions.length <= 1) {
      alert("Cannot move rule: source group must retain at least one rule.");
      return;
    }
    const [moved] = srcGrp.conditions.splice(ruleIdx, 1);
    destGrp.conditions.push(moved);
    saveTree({ ...currentTree, nested_groups: nextGroups });
  }

  // Drag and drop onto group
  function handleGroupDragOver(e: React.DragEvent, grpId: string) {
    e.preventDefault();
    setDragOverGroupId(grpId);
  }

  function handleGroupDrop(e: React.DragEvent, grpId: string) {
    e.preventDefault();
    setDragOverGroupId(null);
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (dataStr) {
        const blockItem: PaletteBlockItem = JSON.parse(dataStr);
        onDropPaletteBlock(grpId, blockItem);
      }
    } catch (err) {
      console.error("Drop failed:", err);
    }
  }

  return (
    <div className="flex-1 bg-[var(--bg)] flex flex-col overflow-y-auto select-none p-6 space-y-6">
      {/* Visual Canvas Flow Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              Visual Strategy Canvas
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30">
                AST Node Editor
              </span>
            </h1>
            <p className="text-[11px] text-[var(--text-muted)]">
              Multi-group conditional flow with recursive Boolean AST evaluation.
            </p>
          </div>
        </div>

        {/* Section Tabs (Entry vs Exit) */}
        <div className="flex items-center gap-2 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setActiveSection("entry")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSection === "entry"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Entry Rules
          </button>
          <button
            onClick={() => setActiveSection("exit")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSection === "exit"
                ? "bg-[#FF7722] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Exit Rules
          </button>
        </div>
      </div>

      {/* NODE 1: Strategy Header & Context Node */}
      <div
        onClick={() => onSelectNode({ type: "strategy_header" })}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          selectedNode?.type === "strategy_header"
            ? "border-[#FF7722] bg-[var(--surface)] ring-2 ring-[#FF7722]/20 shadow-md"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[#FF7722]/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 border border-blue-500/30 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Strategy Node 1 • Context
              </span>
              <div className="text-xs font-bold text-[var(--text)]">{spec.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[#FF7722] font-bold">
              {spec.exchange}:{spec.symbol}
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]">
              Base: {spec.timeframe}
            </span>
            <span className="px-2 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-purple-400 font-bold">
              {spec.trading_mode}
            </span>
          </div>
        </div>
      </div>

      {/* Connecting Flow Line */}
      <div className="flex justify-center -my-3">
        <div className="w-0.5 h-6 bg-[var(--border)]" />
      </div>

      {/* NODE 2: Opening Range (ORB) Module Node */}
      <div
        onClick={() => onSelectNode({ type: "orb_settings" })}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          selectedNode?.type === "orb_settings"
            ? "border-[#FF7722] bg-[var(--surface)] ring-2 ring-[#FF7722]/20 shadow-md"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[#FF7722]/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Strategy Node 2 • Opening Range Module
              </span>
              <div className="text-xs font-bold text-[var(--text)] flex items-center gap-2">
                <span>ORB Breakout Engine</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    spec.orb_settings?.enabled
                      ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                      : "bg-[var(--border)] text-[var(--text-muted)]"
                  }`}
                >
                  {spec.orb_settings?.enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            </div>
          </div>

          {spec.orb_settings?.enabled && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
              <span>Window: {spec.orb_settings.range_start_time}-{spec.orb_settings.range_end_time}</span>
              <span>•</span>
              <span>First Bar: {spec.orb_settings.first_candle_timeframe || "3m"}</span>
              <span>•</span>
              <span>Cutoff: {spec.orb_settings.entry_cutoff_time}</span>
            </div>
          )}
        </div>
      </div>

      {/* Connecting Flow Line */}
      <div className="flex justify-center -my-3">
        <div className="w-0.5 h-6 bg-[var(--border)]" />
      </div>

      {/* NODE 3: Active Rule Tree Canvas (Entry or Exit) */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4 shadow-sm">
        {/* Tree Toolbar Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Strategy Node 3 • {activeSection === "entry" ? "Entry Condition Tree" : "Exit Condition Tree"}
              </span>
              <div className="text-xs font-bold text-[var(--text)]">
                {activeDirection} Direction Logic Engine
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* CALL / PUT Direction Toggle */}
            <div className="flex items-center bg-[var(--bg)] p-1 rounded-lg border border-[var(--border)]">
              <button
                onClick={() => onChangeDirection("CALL")}
                className={`px-3 py-1 rounded text-xs font-bold font-mono transition-all ${
                  activeDirection === "CALL"
                    ? "bg-[#0F8A4B] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                CALL (Bullish)
              </button>
              <button
                onClick={() => onChangeDirection("PUT")}
                className={`px-3 py-1 rounded text-xs font-bold font-mono transition-all ${
                  activeDirection === "PUT"
                    ? "bg-[#D92D20] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                PUT (Bearish)
              </button>
            </div>

            {/* Root Logic Button */}
            <button
              onClick={handleToggleRootLogic}
              title="Toggle root combination operator between groups"
              className="px-2.5 py-1 rounded-lg border border-[#FF7722]/40 bg-[#FF7722]/10 text-[#FF7722] text-xs font-mono font-bold hover:bg-[#FF7722] hover:text-white transition-all flex items-center gap-1.5"
            >
              <span>Root Logic:</span>
              <span className="underline">{currentTree.logic}</span>
            </button>

            {/* Add Group Button */}
            <button
              onClick={handleAddGroup}
              className="px-3 py-1 rounded-lg bg-[#FF7722] text-white text-xs font-semibold hover:bg-[#D9690F] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Group
            </button>
          </div>
        </div>

        {/* Mathematical Formula Preview Box */}
        <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto text-[var(--text)]">
            <span className="text-[#FF7722] font-bold">AST Expression:</span>
            <span>
              {groups.map((g, idx) => {
                const rulesText = g.conditions
                  .map((c) => `${c.left.offset} ${c.left.price_field || "source"} ${c.operator} ${c.right.price_field || c.right.constant_value}`)
                  .join(` ${g.logic} `);
                return `Group ${String.fromCharCode(65 + idx)} (${rulesText})`;
              }).join(` ${currentTree.logic} `) || "(No condition groups defined)"}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 ml-2">
            Deterministic AST
          </span>
        </div>

        {/* Condition Groups Canvas */}
        <div className="space-y-4">
          {groups.map((group, grpIdx) => {
            const groupLetter = String.fromCharCode(65 + grpIdx);
            const isSelectedGroup =
              selectedNode?.type === "condition_group" &&
              selectedNode.treeKey === activeTreeKey &&
              selectedNode.groupIndex === grpIdx;
            const isDragOver = dragOverGroupId === group.id;

            return (
              <div key={group.id} className="space-y-3">
                {/* Inter-Group Logic Separator */}
                {grpIdx > 0 && (
                  <div className="flex items-center justify-center my-2">
                    <span className="px-3 py-0.5 rounded-full bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30 font-mono text-xs font-bold uppercase tracking-widest shadow-sm">
                      {currentTree.logic}
                    </span>
                  </div>
                )}

                {/* Group Card */}
                <div
                  onDragOver={(e) => handleGroupDragOver(e, group.id)}
                  onDragLeave={() => setDragOverGroupId(null)}
                  onDrop={(e) => handleGroupDrop(e, group.id)}
                  className={`p-4 rounded-xl border transition-all ${
                    isDragOver
                      ? "border-[#FF7722] bg-[#FF7722]/5 ring-2 ring-[#FF7722]/30"
                      : isSelectedGroup
                      ? "border-[#FF7722] bg-[var(--surface)] ring-2 ring-[#FF7722]/20 shadow-md"
                      : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border)]"
                  }`}
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]/70">
                    <div
                      onClick={() =>
                        onSelectNode({
                          type: "condition_group",
                          treeKey: activeTreeKey,
                          groupIndex: grpIdx,
                          groupId: group.id,
                        })
                      }
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#FF7722]/20 text-[#FF7722] border border-[#FF7722]/40 text-xs font-mono font-bold flex items-center justify-center">
                        {groupLetter}
                      </span>
                      <span className="text-xs font-bold text-[var(--text)]">
                        Group {groupLetter}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        ({group.conditions.length} {group.conditions.length === 1 ? "rule" : "rules"})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Logic inside group (AND/OR toggle) */}
                      <button
                        onClick={() => handleToggleGroupLogic(grpIdx)}
                        className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:border-[#FF7722] transition-colors"
                      >
                        Internal: <span className="text-[#FF7722]">{group.logic}</span>
                      </button>

                      {/* Add rule to group */}
                      <button
                        onClick={() => handleAddRule(grpIdx)}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FF7722]/15 text-[#FF7722] hover:bg-[#FF7722] hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Rule
                      </button>

                      {/* Duplicate Group */}
                      <button
                        onClick={() => handleDuplicateGroup(grpIdx)}
                        title="Duplicate Group"
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Group */}
                      <button
                        onClick={() => handleDeleteGroup(grpIdx)}
                        title="Delete Group"
                        className="p-1 rounded text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Conditions List */}
                  <div className="mt-3 space-y-2">
                    {group.conditions.map((rule, ruleIdx) => {
                      const isSelectedRule =
                        selectedNode?.type === "condition_rule" &&
                        selectedNode.treeKey === activeTreeKey &&
                        selectedNode.groupIndex === grpIdx &&
                        selectedNode.ruleIndex === ruleIdx;

                      return (
                        <div key={rule.id}>
                          {ruleIdx > 0 && (
                            <div className="pl-6 py-0.5 text-[10px] font-mono font-bold text-[#FF7722] uppercase">
                              {group.logic}
                            </div>
                          )}

                          <div
                            onClick={() =>
                              onSelectNode({
                                type: "condition_rule",
                                treeKey: activeTreeKey,
                                groupIndex: grpIdx,
                                ruleIndex: ruleIdx,
                                ruleId: rule.id,
                              })
                            }
                            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelectedRule
                                ? "border-[#FF7722] bg-[var(--surface)] ring-2 ring-[#FF7722]/30 shadow-sm"
                                : "border-[var(--border)] bg-[var(--surface)] hover:border-[#FF7722]/40"
                            }`}
                          >
                            {/* Rule Row Left (Pill indicators) */}
                            <div className="flex items-center gap-2 text-xs font-mono min-w-0">
                              <span className="w-4 h-4 rounded bg-[var(--bg)] border border-[var(--border)] text-[10px] text-[var(--text-muted)] flex items-center justify-center font-bold">
                                {ruleIdx + 1}
                              </span>

                              {/* Candle Offset */}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  rule.left.offset === 0
                                    ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                    : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                }`}
                              >
                                {rule.left.offset === 0
                                  ? "0 (Forming)"
                                  : `Candle ${rule.left.offset}`}
                              </span>

                              {/* Left Source */}
                              <span className="font-semibold text-[var(--text)]">
                                {rule.left.price_field || rule.left.indicator_type || "Source"}
                              </span>

                              {/* Operator */}
                              <span className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[#FF7722] font-bold text-[11px]">
                                {rule.operator}
                              </span>

                              {/* Right Source / Constant */}
                              <span className="font-semibold text-[var(--text)]">
                                {rule.right.type === "constant"
                                  ? rule.right.constant_value
                                  : rule.right.price_field || rule.right.indicator_type || "Level"}
                              </span>
                            </div>

                            {/* Rule Row Right Actions */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 flex-shrink-0"
                            >
                              {/* Move between groups dropdown if >1 group */}
                              {groups.length > 1 && (
                                <select
                                  value={grpIdx}
                                  onChange={(e) =>
                                    handleMoveRuleToGroup(
                                      grpIdx,
                                      ruleIdx,
                                      parseInt(e.target.value)
                                    )
                                  }
                                  title="Move to another group"
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                                >
                                  {groups.map((_, gIdx) => (
                                    <option key={gIdx} value={gIdx}>
                                      To Grp {String.fromCharCode(65 + gIdx)}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {/* Move up / down */}
                              <button
                                disabled={ruleIdx === 0}
                                onClick={() => handleMoveRule(grpIdx, ruleIdx, "up")}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={ruleIdx === group.conditions.length - 1}
                                onClick={() => handleMoveRule(grpIdx, ruleIdx, "down")}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Duplicate rule */}
                              <button
                                onClick={() => handleDuplicateRule(grpIdx, ruleIdx)}
                                title="Duplicate Rule"
                                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)]"
                              >
                                <Copy className="w-3 h-3" />
                              </button>

                              {/* Delete rule */}
                              <button
                                onClick={() => handleDeleteRule(grpIdx, ruleIdx)}
                                title="Delete Rule"
                                className="p-1 rounded text-red-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connecting Flow Line */}
      <div className="flex justify-center -my-3">
        <div className="w-0.5 h-6 bg-[var(--border)]" />
      </div>

      {/* NODE 4: Exit & Trailing Stop-Loss Node */}
      <div
        onClick={() => onSelectNode({ type: "tsl_settings" })}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          selectedNode?.type === "tsl_settings"
            ? "border-[#FF7722] bg-[var(--surface)] ring-2 ring-[#FF7722]/20 shadow-md"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[#FF7722]/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Strategy Node 4 • Exits, Stop-Loss & TSL Ratchet
              </span>
              <div className="text-xs font-bold text-[var(--text)] flex items-center gap-2">
                <span>SL: {spec.exit_rules.stop_loss_pct || 0.65}%</span>
                <span>•</span>
                <span>Target: {spec.exit_rules.target_profit_pct || 1.5}%</span>
                <span>•</span>
                <span>TSL: {spec.tsl_settings?.enabled ? "Active" : "Off"}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-[var(--text-muted)]">
            Auto Square-off: {spec.exit_rules.intraday_auto_squareoff}
          </div>
        </div>
      </div>

      {/* Connecting Flow Line */}
      <div className="flex justify-center -my-3">
        <div className="w-0.5 h-6 bg-[var(--border)]" />
      </div>

      {/* NODE 5: Risk Limits & Position Sizing Node */}
      <div
        onClick={() => onSelectNode({ type: "risk_limits" })}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          selectedNode?.type === "risk_limits"
            ? "border-[#FF7722] bg-[var(--surface)] ring-2 ring-[#FF7722]/20 shadow-md"
            : "border-[var(--border)] bg-[var(--surface)] hover:border-[#FF7722]/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Strategy Node 5 • Risk Safeguards & Pre-Trade Circuits
              </span>
              <div className="text-xs font-bold text-[var(--text)]">
                Capital: ₹{spec.position_sizing.allocation_capital_inr.toLocaleString()} • Daily Loss Limit: ₹{spec.risk_limits.daily_loss_limit_inr.toLocaleString()}
              </div>
            </div>
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-[var(--bg)] border border-[var(--border)] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            SEBI Risk Guard Ready
          </span>
        </div>
      </div>
    </div>
  );
}
