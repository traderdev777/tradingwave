"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  api,
  SaveStrategyResponse,
  StrategySpec,
  StrategySummaryItem,
  StrategyVersionItem,
  ValidationReport,
  WorkspaceItem,
  DEFAULT_ORB_SETTINGS,
  DEFAULT_TSL_SETTINGS,
} from "../../lib/api";
import { BlockPalette } from "./BlockPalette";
import { CanvasLogicTree } from "./CanvasLogicTree";
import { BlockInspector } from "./BlockInspector";
import { BottomConsoleDrawer } from "./BottomConsoleDrawer";
import {
  PaletteBlockItem,
  SelectedNodeType,
  HistoryState,
} from "./types";
import {
  GitFork,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  FlaskConical,
  PlayCircle,
  Copy,
  FolderOpen,
  Plus,
  Check,
  Zap,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";

interface VisualStrategyBuilderProps {
  workspace: WorkspaceItem | null;
  onNavigateTab: (tabId: string) => void;
  sharedSpec?: StrategySpec;
  onSpecChange?: (spec: StrategySpec) => void;
  savedStrategyId?: string | null;
  onSavedStrategyIdChange?: (id: string | null) => void;
}

export function VisualStrategyBuilder({
  workspace,
  onNavigateTab,
  sharedSpec,
  onSpecChange,
  savedStrategyId,
  onSavedStrategyIdChange,
}: VisualStrategyBuilderProps) {
  // Current Strategy Specification
  const [spec, setSpec] = useState<StrategySpec>(sharedSpec || DEFAULT_ORB_SPEC);
  const [strategyId, setStrategyId] = useState<string | null>(savedStrategyId || null);
  const [versions, setVersions] = useState<StrategyVersionItem[]>([]);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(1);
  const [workspaceStrategies, setWorkspaceStrategies] = useState<StrategySummaryItem[]>([]);

  // Selection & UI State
  const [selectedNode, setSelectedNode] = useState<SelectedNodeType | null>({
    type: "strategy_header",
  });
  const [activeDirection, setActiveDirection] = useState<"CALL" | "PUT">("CALL");
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backtesting, setBacktesting] = useState(false);
  const [paperStarting, setPaperStarting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: sharedSpec || DEFAULT_ORB_SPEC,
    future: [],
  });
  const isUndoRedoAction = useRef(false);

  // Keep synced with parent sharedSpec if provided
  useEffect(() => {
    if (sharedSpec && sharedSpec !== spec) {
      setSpec(sharedSpec);
      setHistory({
        past: [],
        present: sharedSpec,
        future: [],
      });
    }
  }, [sharedSpec]);

  // Load versions and workspace strategies list on mount
  useEffect(() => {
    if (!workspace) return;
    loadWorkspaceStrategies();
    if (strategyId) {
      loadStrategyVersions(strategyId);
    }
  }, [workspace?.id, strategyId]);

  async function loadWorkspaceStrategies() {
    if (!workspace) return;
    try {
      const strats = await api.getWorkspaceStrategies(workspace.id);
      setWorkspaceStrategies(strats);
    } catch (err) {
      console.warn("Could not load workspace strategies:", err);
    }
  }

  async function loadStrategyVersions(stratId: string) {
    if (!workspace) return;
    try {
      const vers = await api.getStrategyVersions(workspace.id, stratId);
      setVersions(vers);
      const active = vers.find((v) => v.is_current) || vers[0];
      if (active) {
        setCurrentVersionNumber(active.version_number);
      }
    } catch (err) {
      console.warn("Could not load strategy versions:", err);
    }
  }

  // Live validation debounced
  const runValidation = useCallback(
    (targetSpec: StrategySpec) => {
      if (!workspace) return;
      setValidating(true);
      api
        .validateStrategy(workspace.id, targetSpec)
        .then((rep) => setValidation(rep))
        .catch((err) => console.error("Validation error:", err))
        .finally(() => setValidating(false));
    },
    [workspace?.id]
  );

  useEffect(() => {
    runValidation(spec);
  }, [workspace?.id]);

  // Central spec update handler with undo history tracking
  function handleUpdateSpec(updatedSpec: StrategySpec) {
    if (!isUndoRedoAction.current) {
      setHistory((prev) => ({
        past: [...prev.past.slice(-25), prev.present],
        present: updatedSpec,
        future: [],
      }));
    }
    isUndoRedoAction.current = false;

    setSpec(updatedSpec);
    if (onSpecChange) {
      onSpecChange(updatedSpec);
    }
    runValidation(updatedSpec);
  }

  // Undo / Redo Handlers
  function handleUndo() {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);

    isUndoRedoAction.current = true;
    setHistory({
      past: newPast,
      present: previous,
      future: [history.present, ...history.future],
    });
    setSpec(previous);
    if (onSpecChange) onSpecChange(previous);
    runValidation(previous);
  }

  function handleRedo() {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    isUndoRedoAction.current = true;
    setHistory({
      past: [...history.past, history.present],
      present: next,
      future: newFuture,
    });
    setSpec(next);
    if (onSpecChange) onSpecChange(next);
    runValidation(next);
  }

  // Keyboard shortcut listener for Ctrl/Cmd+Z and Ctrl/Cmd+Y
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history]);

  // Palette Actions: click-to-add
  function handleAddPaletteBlock(block: PaletteBlockItem) {
    if (block.category === "strategy") {
      if (block.blockType === "strategy_start") {
        setSelectedNode({ type: "strategy_header" });
      } else if (block.blockType === "opening_range") {
        handleUpdateSpec({
          ...spec,
          orb_settings: { ...DEFAULT_ORB_SETTINGS, ...spec.orb_settings, enabled: true },
        });
        setSelectedNode({ type: "orb_settings" });
      } else if (block.blockType === "trading_mode") {
        setSelectedNode({ type: "trading_mode" });
      } else if (block.blockType === "risk_management") {
        setSelectedNode({ type: "risk_limits" });
      }
      return;
    }

    if (block.category === "exit_risk") {
      if (block.blockType === "trailing_stop") {
        handleUpdateSpec({
          ...spec,
          tsl_settings: { ...DEFAULT_TSL_SETTINGS, ...spec.tsl_settings, enabled: true },
        });
        setSelectedNode({ type: "tsl_settings" });
      } else if (block.blockType === "stop_loss" || block.blockType === "profit_target") {
        setSelectedNode({ type: "exit_rules" });
      }
      return;
    }

    // Add condition into active condition tree's first group
    const treeKey = activeDirection === "CALL" ? "call_entry_rules" : "put_entry_rules";
    const currentTree = (spec as any)[treeKey];
    if (!currentTree || !currentTree.nested_groups || currentTree.nested_groups.length === 0) return;

    const nextGroups = [...currentTree.nested_groups];
    const targetGroup = nextGroups[0];

    const priceField = block.payload?.price_field || (block.category === "market_data" ? "close" : "close");
    const offset = block.payload?.offset !== undefined ? block.payload.offset : -1;
    const operator = block.payload?.operator || (activeDirection === "CALL" ? "GREATER_THAN" : "LESS_THAN");

    const newRule = {
      id: `rule_${Date.now()}`,
      left: {
        type: "price_field" as const,
        price_field: priceField,
        offset: offset,
        timeframe: spec.entry_timeframe,
      },
      operator: operator as any,
      right: {
        type: "price_field" as const,
        price_field: activeDirection === "CALL" ? "orb_high" : "orb_low",
        offset: 0,
      },
      description: `Candle ${offset} ${priceField} ${operator} ${activeDirection === "CALL" ? "ORB High" : "ORB Low"}`,
    };

    targetGroup.conditions.push(newRule);
    handleUpdateSpec({
      ...spec,
      [treeKey]: {
        ...currentTree,
        nested_groups: nextGroups,
      },
    });

    setSelectedNode({
      type: "condition_rule",
      treeKey: treeKey,
      groupIndex: 0,
      ruleIndex: targetGroup.conditions.length - 1,
      ruleId: newRule.id,
    });
  }

  // Drag and drop onto specific group
  function handleDropPaletteBlock(targetGroupId: string, block: PaletteBlockItem) {
    const treeKey = activeDirection === "CALL" ? "call_entry_rules" : "put_entry_rules";
    const currentTree = (spec as any)[treeKey];
    if (!currentTree?.nested_groups) return;

    const nextGroups = [...currentTree.nested_groups];
    const targetGroup = nextGroups.find((g) => g.id === targetGroupId) || nextGroups[0];
    if (!targetGroup) return;

    const priceField = block.payload?.price_field || "close";
    const offset = block.payload?.offset !== undefined ? block.payload.offset : -1;

    const newRule = {
      id: `rule_${Date.now()}`,
      left: {
        type: "price_field" as const,
        price_field: priceField,
        offset: offset,
        timeframe: spec.entry_timeframe,
      },
      operator: (activeDirection === "CALL" ? "GREATER_THAN" : "LESS_THAN") as any,
      right: {
        type: "price_field" as const,
        price_field: activeDirection === "CALL" ? "orb_high" : "orb_low",
        offset: 0,
      },
      description: `Candle ${offset} ${priceField} ${activeDirection === "CALL" ? "> ORB High" : "< ORB Low"}`,
    };

    targetGroup.conditions.push(newRule);
    handleUpdateSpec({
      ...spec,
      [treeKey]: {
        ...currentTree,
        nested_groups: nextGroups,
      },
    });
  }

  // Load ORB Template
  function handleLoadOrbTemplate() {
    if (confirm("Load canonical Opening Range Breakout (ORB) template? Unsaved changes will be replaced.")) {
      handleUpdateSpec(DEFAULT_ORB_SPEC);
      setNotification({
        type: "success",
        text: "Canonical ORB Multi-Group strategy template loaded successfully.",
      });
      setTimeout(() => setNotification(null), 3000);
    }
  }

  // Save Strategy to Database & Version
  async function handleSaveStrategy() {
    if (!workspace) {
      setNotification({ type: "error", text: "Please select an active workspace." });
      return;
    }
    setSaving(true);
    setNotification(null);

    try {
      const resp = await api.saveStrategy(workspace.id, {
        spec,
        strategy_id: strategyId || undefined,
      });

      setStrategyId(resp.strategy_id);
      if (onSavedStrategyIdChange) {
        onSavedStrategyIdChange(resp.strategy_id);
      }
      setCurrentVersionNumber(resp.version_number);
      loadStrategyVersions(resp.strategy_id);
      loadWorkspaceStrategies();

      setNotification({
        type: "success",
        text: `Strategy '${resp.name}' saved as Version #${resp.version_number} (${resp.specification_hash.slice(0, 8)}).`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error("Save strategy failed:", err);
      setNotification({
        type: "error",
        text: err.message || "Failed to persist strategy version.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Duplicate Strategy
  async function handleDuplicateStrategy() {
    if (!workspace || !strategyId) {
      setNotification({ type: "error", text: "Save the strategy first before duplicating." });
      return;
    }
    try {
      const resp = await api.duplicateStrategy(workspace.id, strategyId);
      setStrategyId(resp.strategy_id);
      if (onSavedStrategyIdChange) onSavedStrategyIdChange(resp.strategy_id);
      setSpec(resp.spec);
      if (onSpecChange) onSpecChange(resp.spec);
      loadStrategyVersions(resp.strategy_id);
      loadWorkspaceStrategies();
      setNotification({
        type: "success",
        text: `Duplicated into new draft: '${resp.name}'.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to duplicate strategy." });
    }
  }

  // Switch Strategy Version
  async function handleSwitchVersion(versionId: string) {
    if (!workspace || !strategyId) return;
    try {
      const resp = await api.getStrategyDetails(workspace.id, strategyId, versionId);
      setSpec(resp.spec);
      if (onSpecChange) onSpecChange(resp.spec);
      setCurrentVersionNumber(resp.version_number);
      runValidation(resp.spec);
      setNotification({
        type: "success",
        text: `Switched to Version #${resp.version_number}.`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load version." });
    }
  }

  // Load an existing strategy from the workspace
  async function handleLoadStrategy(targetStratId: string) {
    if (!workspace) return;
    try {
      const resp = await api.getStrategyDetails(workspace.id, targetStratId);
      setStrategyId(resp.strategy_id);
      if (onSavedStrategyIdChange) onSavedStrategyIdChange(resp.strategy_id);
      setSpec(resp.spec);
      if (onSpecChange) onSpecChange(resp.spec);
      setCurrentVersionNumber(resp.version_number);
      loadStrategyVersions(resp.strategy_id);
      runValidation(resp.spec);
      setNotification({
        type: "success",
        text: `Loaded strategy '${resp.name}'.`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to load strategy." });
    }
  }

  // Trigger Backtest
  async function handleTriggerBacktest() {
    if (!workspace) return;
    setBacktesting(true);
    setNotification(null);

    try {
      let activeStratId = strategyId;
      if (!activeStratId) {
        const saveResp = await api.saveStrategy(workspace.id, { spec });
        activeStratId = saveResp.strategy_id;
        setStrategyId(activeStratId);
        if (onSavedStrategyIdChange) onSavedStrategyIdChange(activeStratId);
      }

      const btResp = await api.triggerBacktest(workspace.id, {
        strategy_id: activeStratId,
      });

      setNotification({
        type: "success",
        text: `${btResp.message} Job ID: ${btResp.job_id.slice(0, 8)}...`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Cannot trigger backtest: strategy has blocking validation errors.",
      });
    } finally {
      setBacktesting(false);
    }
  }

  // Trigger Paper Session
  async function handleTriggerPaperSession() {
    if (!workspace) return;
    setPaperStarting(true);
    setNotification(null);

    try {
      let activeStratId = strategyId;
      if (!activeStratId) {
        const saveResp = await api.saveStrategy(workspace.id, { spec });
        activeStratId = saveResp.strategy_id;
        setStrategyId(activeStratId);
        if (onSavedStrategyIdChange) onSavedStrategyIdChange(activeStratId);
      }

      const paperResp = await api.triggerPaperSession(workspace.id, {
        strategy_id: activeStratId,
      });

      setNotification({
        type: "success",
        text: `${paperResp.message} Session ID: ${paperResp.session_id.slice(0, 8)}...`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Failed to initialize paper trading session.",
      });
    } finally {
      setPaperStarting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden font-sans select-none">
      {/* TOP TOOLBAR */}
      <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)] px-4 flex items-center justify-between flex-shrink-0 z-10 transition-colors">
        {/* Left: Strategy Name & Version Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={spec.name}
                  onChange={(e) => handleUpdateSpec({ ...spec, name: e.target.value })}
                  className="text-xs font-bold text-[var(--text)] bg-transparent hover:bg-[var(--bg)] px-1.5 py-0.5 rounded border border-transparent hover:border-[var(--border)] focus:border-[#FF7722] focus:bg-[var(--bg)] focus:outline-none transition-all w-64 truncate"
                  title="Click to rename strategy"
                />
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg)] border border-[var(--border)] text-[#FF7722] font-semibold">
                  v{currentVersionNumber}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-2">
                <span>{spec.exchange}:{spec.symbol}</span>
                <span>•</span>
                <span>{spec.trading_mode}</span>
                <span>•</span>
                <span>{strategyId ? "Saved in Workspace" : "Unsaved Draft"}</span>
              </div>
            </div>
          </div>

          {/* Strategy Selector Dropdown */}
          {workspaceStrategies.length > 0 && (
            <select
              value={strategyId || ""}
              onChange={(e) => {
                if (e.target.value) handleLoadStrategy(e.target.value);
              }}
              title="Load saved strategy from workspace"
              className="text-[11px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:border-[#FF7722] transition-colors max-w-[140px] truncate"
            >
              <option value="">Load Strategy...</option>
              {workspaceStrategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (v{s.current_version_number || 1})
                </option>
              ))}
            </select>
          )}

          {/* Version Selector Dropdown */}
          {versions.length > 1 && (
            <select
              value={versions.find((v) => v.version_number === currentVersionNumber)?.version_id || ""}
              onChange={(e) => handleSwitchVersion(e.target.value)}
              title="Switch immutable version"
              className="text-[11px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[#FF7722] font-mono font-bold"
            >
              {versions.map((v) => (
                <option key={v.version_id} value={v.version_id}>
                  Version #{v.version_number} {v.is_current ? "(Current)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Center: Undo / Redo & ORB Template */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={history.past.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-30 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={history.future.length === 0}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-30 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[var(--border)] mx-1" />

          {/* Load ORB Template */}
          <button
            onClick={handleLoadOrbTemplate}
            className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Load canonical Opening Range Breakout strategy template"
          >
            <Zap className="w-3.5 h-3.5" />
            ORB Template
          </button>

          {/* Duplicate Strategy */}
          {strategyId && (
            <button
              onClick={handleDuplicateStrategy}
              title="Duplicate strategy into a new draft"
              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Switch to AI Studio */}
          <button
            onClick={() => onNavigateTab("ai_studio")}
            className="px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Open in AI Strategy Studio with full specification preserved"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Open in AI Studio
          </button>
        </div>

        {/* Right: Validate, Save Version, Backtest, Paper Trade */}
        <div className="flex items-center gap-2">
          {/* Validate Button */}
          <button
            onClick={() => runValidation(spec)}
            disabled={validating}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:border-[#FF7722] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-[#FF7722]" />
            {validating ? "Validating..." : "Validate"}
          </button>

          {/* Save Version Button */}
          <button
            onClick={handleSaveStrategy}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-[#FF7722] text-white hover:bg-[#D9690F] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Version"}
          </button>

          {/* Backtest Button */}
          <button
            onClick={handleTriggerBacktest}
            disabled={backtesting}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {backtesting ? "Queueing..." : "Backtest"}
          </button>

          {/* Paper Trade Button */}
          <button
            onClick={handleTriggerPaperSession}
            disabled={paperStarting}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            {paperStarting ? "Starting..." : "Paper Trade"}
          </button>
        </div>
      </header>

      {/* NOTIFICATION BANNER */}
      {notification && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between transition-all ${
            notification.type === "success"
              ? "bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 font-medium"
              : "bg-red-500/15 border-b border-red-500/30 text-red-400 font-medium"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[10px] underline hover:no-underline font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3-COLUMN WORKSPACE: Palette | Canvas | Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Palette */}
        <BlockPalette
          onAddBlock={handleAddPaletteBlock}
          activeDirection={activeDirection}
        />

        {/* Center: Canvas Logic Tree */}
        <CanvasLogicTree
          spec={spec}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          onUpdateSpec={handleUpdateSpec}
          activeDirection={activeDirection}
          onChangeDirection={setActiveDirection}
          onDropPaletteBlock={handleDropPaletteBlock}
        />

        {/* Right: Block Inspector */}
        <BlockInspector
          spec={spec}
          selectedNode={selectedNode}
          onUpdateSpec={handleUpdateSpec}
        />
      </div>

      {/* BOTTOM DRAWER: Strategy Preview, Validation Console, Assumptions */}
      <BottomConsoleDrawer
        spec={spec}
        validation={validation}
        validating={validating}
      />
    </div>
  );
}

// Canonical Default Opening Range Breakout Specification
const DEFAULT_ORB_SPEC: StrategySpec = {
  id: "strat_orb_canonical",
  name: "NSE NIFTY50 Canonical Opening Range Breakout",
  description:
    "Institutional ORB strategy with independent 09:15-09:30 calculation timeframe, first 3m candle evaluation, (A1 AND A2) OR (B1 AND B2) CALL/PUT breakout logic, and TSL profit ratchets.",
  category: "ORB",
  exchange: "NSE",
  symbol: "NIFTY50",
  timeframe: "15m",
  entry_timeframe: "5m",
  exit_timeframe: "1m",
  trading_mode: "INTRADAY",
  direction: "BOTH",
  trading_session: "09:15-15:30 IST",
  orb_settings: {
    enabled: true,
    range_start_time: "09:15",
    range_end_time: "09:30",
    entry_start_time: "09:30",
    entry_cutoff_time: "14:30",
    calculation_timeframe: "15m",
    first_candle_timeframe: "3m",
    confirmation_method: "CANDLE_CLOSE",
    breakout_buffer_pct: 0.1,
    one_entry_per_breakout: true,
    max_entries_per_session: 2,
    range_basis: "HIGH_LOW",
    allow_opposite_side_reentry: false,
  },
  btst_settings: {
    enabled: false,
    entry_window_start: "15:00",
    entry_window_end: "15:25",
    next_session_exit_start: "09:15",
    next_session_exit_cutoff: "09:30",
    gap_risk_acknowledged: false,
    squareoff_on_gap_breach: true,
  },
  tsl_settings: {
    enabled: true,
    activation_type: "POINTS",
    activation_value: 20.0,
    distance_type: "POINTS",
    distance_value: 10.0,
    step_value: 5.0,
    atr_multiplier: 1.5,
    update_timeframe: "1m",
    evaluation_candle_offset: -1,
    lock_profit_at_activation: true,
  },
  indicators: [
    { id: "ind_ema9", type: "EMA", period: 9, source: "close" },
    { id: "ind_rsi14", type: "RSI", period: 14, source: "close" },
  ],
  entry_rules: {
    id: "grp_entry_root",
    logic: "OR",
    conditions: [],
    nested_groups: [],
  },
  call_entry_rules: {
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
            left: { type: "price_field", price_field: "close", offset: -2, timeframe: "5m" },
            operator: "LESS_THAN",
            right: { type: "price_field", price_field: "orb_high", offset: 0 },
            description: "Candle -2 Close < ORB High",
          },
          {
            id: "rule_call_a2",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "5m" },
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
            left: { type: "price_field", price_field: "close", offset: -2, timeframe: "5m" },
            operator: "LESS_THAN",
            right: { type: "price_field", price_field: "orb_low", offset: 0 },
            description: "Candle -2 Close < ORB Low",
          },
          {
            id: "rule_call_b2",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "5m" },
            operator: "GREATER_THAN",
            right: { type: "price_field", price_field: "orb_low", offset: 0 },
            description: "Candle -1 Close > ORB Low",
          },
        ],
        nested_groups: [],
      },
    ],
  },
  put_entry_rules: {
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
            left: { type: "price_field", price_field: "close", offset: -2, timeframe: "5m" },
            operator: "GREATER_THAN",
            right: { type: "price_field", price_field: "orb_low", offset: 0 },
            description: "Candle -2 Close > ORB Low",
          },
          {
            id: "rule_put_a2",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "5m" },
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
            left: { type: "price_field", price_field: "close", offset: -2, timeframe: "5m" },
            operator: "GREATER_THAN",
            right: { type: "price_field", price_field: "orb_high", offset: 0 },
            description: "Candle -2 Close > ORB High",
          },
          {
            id: "rule_put_b2",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "5m" },
            operator: "LESS_THAN",
            right: { type: "price_field", price_field: "orb_high", offset: 0 },
            description: "Candle -1 Close < ORB High",
          },
        ],
        nested_groups: [],
      },
    ],
  },
  call_exit_rules: {
    id: "grp_call_exit_root",
    logic: "OR",
    conditions: [],
    nested_groups: [
      {
        id: "grp_call_exit_1",
        logic: "AND",
        conditions: [
          {
            id: "rule_call_exit_a1",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "1m" },
            operator: "LESS_THAN",
            right: { type: "price_field", price_field: "orb_midpoint", offset: 0 },
            description: "Candle -1 Close < ORB Midpoint",
          },
        ],
        nested_groups: [],
      },
    ],
  },
  put_exit_rules: {
    id: "grp_put_exit_root",
    logic: "OR",
    conditions: [],
    nested_groups: [
      {
        id: "grp_put_exit_1",
        logic: "AND",
        conditions: [
          {
            id: "rule_put_exit_a1",
            left: { type: "price_field", price_field: "close", offset: -1, timeframe: "1m" },
            operator: "GREATER_THAN",
            right: { type: "price_field", price_field: "orb_midpoint", offset: 0 },
            description: "Candle -1 Close > ORB Midpoint",
          },
        ],
        nested_groups: [],
      },
    ],
  },
  exit_rules: {
    stop_loss_pct: 0.65,
    target_profit_pct: 1.5,
    trailing_stop_enabled: true,
    trailing_stop_trigger_pct: 1.0,
    trailing_stop_step_pct: 0.25,
    intraday_auto_squareoff: "15:15 IST",
    exit_on_opposite_signal: true,
  },
  position_sizing: {
    method: "FIXED_CAPITAL",
    value: 100000.0,
    max_risk_per_trade_pct: 1.0,
    allocation_capital_inr: 500000.0,
  },
  risk_limits: {
    max_capital_allocation_inr: 500000.0,
    max_open_positions: 3,
    daily_loss_limit_inr: 15000.0,
    max_order_quantity: 1800,
    allowed_trading_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    prevent_duplicate_entries: true,
    entry_cooldown_bars: 3,
  },
  execution_settings: {
    slippage_pct: 0.05,
    include_stt_ctt: true,
    include_exchange_turnover_charges: true,
    include_gst: true,
    brokerage_per_order_inr: 20.0,
  },
  lifecycle_state: "VALIDATED",
};
