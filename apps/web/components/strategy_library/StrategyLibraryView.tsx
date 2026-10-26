"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Library,
  Plus,
  Sparkles,
  GitFork,
  Search,
  SlidersHorizontal,
  X,
  RotateCw,
  Folder,
  Star,
  Archive,
  Grid,
  List,
  ArrowUpDown,
  Layers,
  FileCheck2,
  FileClock,
  FlaskConical,
  PlayCircle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import {
  api,
  StrategyLibraryItem,
  StrategyLibrarySummary,
  StrategyFolderItem,
  StrategyTemplateItem,
  WorkspaceItem,
} from "../../lib/api";
import { StrategyCard } from "./StrategyCard";
import { StrategyTableView } from "./StrategyTableView";
import { TemplateCatalogView } from "./TemplateCatalogView";
import { CreateStrategyModal } from "./CreateStrategyModal";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { StrategyComparisonModal } from "./StrategyComparisonModal";
import { BacktestHistoryModal } from "./BacktestHistoryModal";
import { FolderManagementModal } from "./FolderManagementModal";

interface StrategyLibraryViewProps {
  workspace: WorkspaceItem | null;
  onNavigateTab: (tabId: string) => void;
  onOpenInAIStudio: (spec: any, strategyId: string) => void;
  onOpenInVisualBuilder: (spec: any, strategyId: string) => void;
}

export function StrategyLibraryView({
  workspace,
  onNavigateTab,
  onOpenInAIStudio,
  onOpenInVisualBuilder,
}: StrategyLibraryViewProps) {
  // Navigation Tabs: "strategies" | "templates" | "archived"
  const [activeTab, setActiveTab] = useState<"strategies" | "templates" | "archived">("strategies");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Data State
  const [strategies, setStrategies] = useState<StrategyLibraryItem[]>([]);
  const [summary, setSummary] = useState<StrategyLibrarySummary | null>(null);
  const [folders, setFolders] = useState<StrategyFolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("");
  const [tradingModeFilter, setTradingModeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recently_updated");
  const [page, setPage] = useState(1);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [selectedForVersionHistory, setSelectedForVersionHistory] = useState<StrategyLibraryItem | null>(null);
  const [selectedForBacktestHistory, setSelectedForBacktestHistory] = useState<StrategyLibraryItem | null>(null);
  const [comparisonState, setComparisonState] = useState<{
    baseStrategyId: string;
    baseVersionId?: string;
    targetStrategyId: string;
    targetVersionId?: string;
  } | null>(null);

  const workspaceId = workspace?.id || "";

  // Load Strategies and Summary
  const loadStrategies = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.getLibraryStrategies(workspaceId, {
        q: searchQuery || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        instrument: instrumentFilter || undefined,
        trading_mode: tradingModeFilter || undefined,
        source: sourceFilter || undefined,
        folder_id: folderFilter || undefined,
        is_favorite: favoritesOnly || undefined,
        is_archived: activeTab === "archived" ? true : false,
        sort_by: sortBy,
        page,
        page_size: 24,
      });

      setStrategies(res.items);
      setSummary(res.summary_counts);
    } catch (err: any) {
      setError(err.message || "Failed to load strategy library.");
    } finally {
      setLoading(false);
    }
  }, [
    workspaceId,
    searchQuery,
    statusFilter,
    categoryFilter,
    instrumentFilter,
    tradingModeFilter,
    sourceFilter,
    folderFilter,
    favoritesOnly,
    activeTab,
    sortBy,
    page,
  ]);

  // Load Folders
  const loadFolders = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await api.getFolders(workspaceId);
      setFolders(data);
    } catch (err) {
      console.error("Failed to load workspace folders:", err);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      loadStrategies();
      loadFolders();
    }
  }, [workspaceId, loadStrategies, loadFolders]);

  // Reset Filters
  function handleResetFilters() {
    setSearchQuery("");
    setStatusFilter("");
    setCategoryFilter("");
    setInstrumentFilter("");
    setTradingModeFilter("");
    setSourceFilter("");
    setFolderFilter("");
    setFavoritesOnly(false);
    setSortBy("recently_updated");
    setPage(1);
  }

  // Strategy Operations
  async function handleToggleFavorite(strategyId: string) {
    if (!workspaceId) return;
    try {
      const res = await api.toggleStrategyFavorite(workspaceId, strategyId);
      setStrategies((prev) =>
        prev.map((s) => (s.id === strategyId ? { ...s, is_favorite: res.is_favorite } : s))
      );
      if (summary) {
        setSummary({
          ...summary,
          favorites_count: res.is_favorite ? summary.favorites_count + 1 : Math.max(0, summary.favorites_count - 1),
        });
      }
    } catch (err: any) {
      alert("Failed to toggle favorite: " + err.message);
    }
  }

  async function handleArchive(strategyId: string) {
    if (!workspaceId) return;
    try {
      await api.archiveStrategy(workspaceId, strategyId);
      loadStrategies();
    } catch (err: any) {
      alert("Failed to archive strategy: " + err.message);
    }
  }

  async function handleRestore(strategyId: string) {
    if (!workspaceId) return;
    try {
      await api.restoreStrategy(workspaceId, strategyId);
      loadStrategies();
    } catch (err: any) {
      alert("Failed to restore strategy: " + err.message);
    }
  }

  async function handleDelete(strategyId: string) {
    if (!workspaceId) return;
    try {
      await api.deleteStrategy(workspaceId, strategyId);
      setStrategies((prev) => prev.filter((s) => s.id !== strategyId));
      if (summary) {
        setSummary({
          ...summary,
          total_strategies: Math.max(0, summary.total_strategies - 1),
        });
      }
    } catch (err: any) {
      alert("Failed to delete strategy: " + err.message);
    }
  }

  async function handleDuplicate(strategyId: string) {
    if (!workspaceId) return;
    try {
      const duplicated = await api.duplicateStrategyInLibrary(workspaceId, strategyId);
      loadStrategies();
      alert(`Strategy successfully duplicated as "${duplicated.name}"`);
    } catch (err: any) {
      alert("Failed to duplicate strategy: " + err.message);
    }
  }

  async function handleMoveToFolder(strategyId: string, targetFolderId?: string) {
    if (!workspaceId) return;
    try {
      await api.updateStrategyMetadata(workspaceId, strategyId, {
        folder_id: targetFolderId,
      });
      loadStrategies();
      loadFolders();
    } catch (err: any) {
      alert("Failed to move strategy: " + err.message);
    }
  }

  async function handleRename(strategyId: string, newName: string) {
    if (!workspaceId) return;
    try {
      await api.updateStrategyMetadata(workspaceId, strategyId, {
        name: newName,
      });
      setStrategies((prev) =>
        prev.map((s) => (s.id === strategyId ? { ...s, name: newName } : s))
      );
    } catch (err: any) {
      alert("Failed to rename strategy: " + err.message);
    }
  }

  function handleCardRename(s: StrategyLibraryItem) {
    const newName = prompt("Enter new strategy name:", s.name);
    if (newName && newName.trim() && newName.trim() !== s.name) {
      handleRename(s.id, newName.trim());
    }
  }

  function handleCardMoveToFolder(s: StrategyLibraryItem) {
    if (folders.length === 0) {
      alert("No custom folders created yet. Click 'Folders' in the header to create one.");
      return;
    }
    const folderList = folders.map((f, i) => `${i + 1}. ${f.name}`).join("\n");
    const choice = prompt(`Select target folder:\n0. Remove from folder (Root)\n${folderList}`);
    if (choice === null) return;
    const num = parseInt(choice, 10);
    if (num === 0) {
      handleMoveToFolder(s.id, undefined);
    } else if (num > 0 && num <= folders.length) {
      handleMoveToFolder(s.id, folders[num - 1].id);
    }
  }

  function handleCardManageTags(s: StrategyLibraryItem) {
    const currentTags = (s.tags || []).join(", ");
    const input = prompt("Enter tags (comma separated):", currentTags);
    if (input === null) return;
    const tags = input.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    api.updateStrategyMetadata(workspaceId, s.id, { tags }).then(() => {
      loadStrategies();
    }).catch((err) => alert("Failed to update tags: " + err.message));
  }

  function handleCardCompare(s: StrategyLibraryItem) {
    const other = strategies.find((item) => item.id !== s.id);
    if (!other) {
      alert("Need at least 2 strategies to compare. Create another strategy or version.");
      return;
    }
    setComparisonState({
      baseStrategyId: s.id,
      targetStrategyId: other.id,
    });
  }

  function handleStrategyCreated(newStrategy: { id: string; name: string; spec: any }, targetTool: "ai_studio" | "visual_builder") {
    loadStrategies();
    loadFolders();
    if (targetTool === "ai_studio") {
      onOpenInAIStudio(newStrategy.spec, newStrategy.id);
    } else {
      onOpenInVisualBuilder(newStrategy.spec, newStrategy.id);
    }
  }

  async function handleUseTemplate(template: StrategyTemplateItem) {
    if (!workspaceId) return;
    try {
      const res = await api.createFromTemplate(workspaceId, template.template_id, {
        name: `${template.name} (Draft)`,
      });
      loadStrategies();
      loadFolders();
      if (res.open_in === "ai_studio") {
        onOpenInAIStudio(res.spec, res.strategy_id);
      } else {
        onOpenInVisualBuilder(res.spec, res.strategy_id);
      }
    } catch (err: any) {
      alert("Failed to instantiate strategy from template: " + (err.message || "Unknown error"));
    }
  }

  const activeFiltersCount = [
    statusFilter,
    categoryFilter,
    instrumentFilter,
    tradingModeFilter,
    sourceFilter,
    folderFilter,
    favoritesOnly,
  ].filter(Boolean).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
                <Library className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-[var(--text)] tracking-tight">Strategy Library</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
                {workspace?.name || "Workspace"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Discover, build, organize, and manage your trading strategies.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab("ai_studio")}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] hover:border-[#FF7722] hover:text-[#FF7722] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF7722]" />
              AI Studio
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("visual_builder")}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] hover:border-blue-500 hover:text-blue-500 bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <GitFork className="w-3.5 h-3.5 text-blue-500" />
              Visual Builder
            </button>
            <button
              type="button"
              onClick={() => setIsFolderModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--border)]/30 bg-[var(--surface-alt)] text-xs font-semibold text-[var(--text)] inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Folder className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Folders ({folders.length})
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#FF7722]/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Strategy
            </button>
          </div>
        </div>

        {/* Real Backend Counts Ribbon */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 mt-5">
            <SummaryCard
              label="Total Strategies"
              value={summary.total_strategies}
              icon={Layers}
              color="text-[var(--text)]"
              active={activeTab === "strategies" && !statusFilter && !favoritesOnly}
              onClick={() => {
                setActiveTab("strategies");
                handleResetFilters();
              }}
            />
            <SummaryCard
              label="Draft"
              value={summary.draft_count}
              icon={FileClock}
              color="text-amber-500"
              active={statusFilter === "DRAFT"}
              onClick={() => {
                setActiveTab("strategies");
                setStatusFilter("DRAFT");
              }}
            />
            <SummaryCard
              label="Validated"
              value={summary.validated_count}
              icon={FileCheck2}
              color="text-green-500"
              active={statusFilter === "VALIDATED"}
              onClick={() => {
                setActiveTab("strategies");
                setStatusFilter("VALIDATED");
              }}
            />
            <SummaryCard
              label="Backtested"
              value={summary.backtested_count}
              icon={FlaskConical}
              color="text-purple-500"
              active={statusFilter === "BACKTESTED"}
              onClick={() => {
                setActiveTab("strategies");
                setStatusFilter("BACKTESTED");
              }}
            />
            <SummaryCard
              label="Paper Trading"
              value={summary.paper_count}
              icon={PlayCircle}
              color="text-blue-500"
              active={statusFilter === "PAPER_TRADING"}
              onClick={() => {
                setActiveTab("strategies");
                setStatusFilter("PAPER_TRADING");
              }}
            />
            <SummaryCard
              label="Favorites"
              value={summary.favorites_count}
              icon={Star}
              color="text-yellow-500"
              active={favoritesOnly}
              onClick={() => {
                setActiveTab("strategies");
                setFavoritesOnly(!favoritesOnly);
              }}
            />
            <SummaryCard
              label="Archived"
              value={summary.archived_count}
              icon={Archive}
              color="text-[var(--text-muted)]"
              active={activeTab === "archived"}
              onClick={() => {
                setActiveTab(activeTab === "archived" ? "strategies" : "archived");
              }}
            />
          </div>
        )}
      </div>

      {/* Primary Section Tabs: Strategies vs Template Catalog vs Archived */}
      <div className="px-6 border-b border-[var(--border)] bg-[var(--surface-alt)] flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("strategies")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "strategies"
                ? "border-[#FF7722] text-[#FF7722]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <span>My Strategies</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--surface)] border border-[var(--border)]">
              {summary ? summary.total_strategies : 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("templates")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "templates"
                ? "border-[#FF7722] text-[#FF7722]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <span>Template Catalog</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30">
              8 Canonical
            </span>
          </button>

          <button
            onClick={() => setActiveTab("archived")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "archived"
                ? "border-[#FF7722] text-[#FF7722]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <span>Archived</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--surface)] border border-[var(--border)]">
              {summary ? summary.archived_count : 0}
            </span>
          </button>
        </div>

        {/* View Mode & Refresh */}
        {activeTab !== "templates" && (
          <div className="flex items-center gap-2">
            <button
              onClick={loadStrategies}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
              title="Refresh"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <div className="flex items-center rounded-lg border border-[var(--border)] p-0.5 bg-[var(--surface)]">
              <button
                onClick={() => setViewMode("card")}
                className={`p-1 rounded-md text-xs transition-colors ${
                  viewMode === "card"
                    ? "bg-[#FF7722] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                title="Card View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1 rounded-md text-xs transition-colors ${
                  viewMode === "table"
                    ? "bg-[#FF7722] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main View Body */}
      {activeTab === "templates" ? (
        <TemplateCatalogView
          workspace={workspace}
          onUseTemplate={handleUseTemplate}
        />
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col p-6 space-y-4">
          {/* Search, Filter Bar & Sort Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search strategies by name, symbol, tags, indicator, or category..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Selects & Sorting */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="Opening Range Breakout">Opening Range Breakout</option>
                <option value="Trend Following">Trend Following</option>
                <option value="Momentum">Momentum</option>
                <option value="Mean Reversion">Mean Reversion</option>
                <option value="Breakout">Breakout</option>
                <option value="Price Action">Price Action</option>
                <option value="Indicator-Based">Indicator-Based</option>
                <option value="Multi-Condition">Multi-Condition</option>
                <option value="Custom">Custom</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="VALIDATED">Validated</option>
                <option value="VALIDATION_FAILED">Validation Failed</option>
                <option value="BACKTESTED">Backtested</option>
                <option value="PAPER_TRADING">Paper Trading</option>
              </select>

              {/* Folder Filter */}
              {folders.length > 0 && (
                <select
                  value={folderFilter}
                  onChange={(e) => {
                    setFolderFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                >
                  <option value="">All Folders</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Sort By */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-[var(--text)] font-medium focus:outline-none cursor-pointer"
                >
                  <option value="recently_updated">Recently Updated</option>
                  <option value="recently_created">Recently Created</option>
                  <option value="alphabetical">Alphabetical (A-Z)</option>
                  <option value="recently_backtested">Most Recently Backtested</option>
                </select>
              </div>

              {/* Reset Filters button if any filter is active */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  Reset Filters ({activeFiltersCount})
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#FF7722] border-t-transparent animate-spin" />
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Querying persisted workspace strategies...
              </span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-3 text-xs text-red-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error loading strategies: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Empty Results State */}
          {!loading && !error && strategies.length === 0 && (
            <div className="py-20 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-center p-8 space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#FF7722]/10 border border-[#FF7722]/20 flex items-center justify-center text-[#FF7722] mx-auto">
                <Library className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text)]">
                  {searchQuery || activeFiltersCount > 0
                    ? "No matching strategies found"
                    : activeTab === "archived"
                    ? "No archived strategies"
                    : "No strategies created yet"}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto leading-relaxed">
                  {searchQuery || activeFiltersCount > 0
                    ? "Try adjusting your search criteria, category filters, or clearing active filters."
                    : activeTab === "archived"
                    ? "Archived strategies will appear here for safe keeping and restoration."
                    : "Get started by generating a strategy with AI Studio, composing one in Visual Builder, or launching from a canonical template."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {searchQuery || activeFiltersCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
                  >
                    Clear All Filters
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab("templates")}
                      className="px-4 py-2 rounded-xl bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold shadow"
                    >
                      Browse Strategy Templates
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
                    >
                      Create Custom Strategy
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Data Views: Card Grid vs Table View */}
          {!loading && !error && strategies.length > 0 && (
            <>
              {viewMode === "card" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {strategies.map((strategy) => (
                    <StrategyCard
                      key={strategy.id}
                      strategy={strategy}
                      folders={folders}
                      onOpenInAIStudio={(s) => onOpenInAIStudio(s.spec, s.id)}
                      onOpenInVisualBuilder={(s) => onOpenInVisualBuilder(s.spec, s.id)}
                      onToggleFavorite={(s) => handleToggleFavorite(s.id)}
                      onArchive={(s) => handleArchive(s.id)}
                      onRestore={(s) => handleRestore(s.id)}
                      onDelete={(s) => handleDelete(s.id)}
                      onDuplicate={(s) => handleDuplicate(s.id)}
                      onRename={handleCardRename}
                      onMoveToFolder={handleCardMoveToFolder}
                      onManageTags={handleCardManageTags}
                      onViewVersions={(s) => setSelectedForVersionHistory(s)}
                      onViewBacktests={(s) => setSelectedForBacktestHistory(s)}
                      onCompare={handleCardCompare}
                    />
                  ))}
                </div>
              ) : (
                <StrategyTableView
                  strategies={strategies}
                  onOpenInAIStudio={(s) => onOpenInAIStudio(s.spec, s.id)}
                  onOpenInVisualBuilder={(s) => onOpenInVisualBuilder(s.spec, s.id)}
                  onToggleFavorite={(s) => handleToggleFavorite(s.id)}
                  onDuplicate={(s) => handleDuplicate(s.id)}
                  onViewVersions={(s) => setSelectedForVersionHistory(s)}
                  onViewBacktests={(s) => setSelectedForBacktestHistory(s)}
                  onCompare={handleCardCompare}
                  onDelete={(s) => handleDelete(s.id)}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {isCreateOpen && (
        <CreateStrategyModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          workspaceId={workspaceId}
          folders={folders}
          onCreated={handleStrategyCreated}
          onBrowseTemplates={() => setActiveTab("templates")}
        />
      )}

      {isFolderModalOpen && (
        <FolderManagementModal
          isOpen={isFolderModalOpen}
          onClose={() => setIsFolderModalOpen(false)}
          workspaceId={workspaceId}
          folders={folders}
          onFoldersUpdated={() => {
            loadFolders();
            loadStrategies();
          }}
        />
      )}

      {selectedForVersionHistory && (
        <VersionHistoryModal
          isOpen={!!selectedForVersionHistory}
          onClose={() => setSelectedForVersionHistory(null)}
          strategy={selectedForVersionHistory}
          workspaceId={workspaceId}
          onRestored={(restored) => {
            loadStrategies();
            alert(`Version restored as draft (v${restored.version_number})`);
          }}
          onCompareVersions={(versionAId, versionBId) => {
            setComparisonState({
              baseStrategyId: selectedForVersionHistory.id,
              baseVersionId: versionAId,
              targetStrategyId: selectedForVersionHistory.id,
              targetVersionId: versionBId,
            });
          }}
        />
      )}

      {selectedForBacktestHistory && (
        <BacktestHistoryModal
          isOpen={!!selectedForBacktestHistory}
          onClose={() => setSelectedForBacktestHistory(null)}
          strategy={selectedForBacktestHistory}
          workspaceId={workspaceId}
          onNavigateBacktestLab={() => onNavigateTab("backtest_lab")}
        />
      )}

      {comparisonState && (
        <StrategyComparisonModal
          isOpen={!!comparisonState}
          onClose={() => setComparisonState(null)}
          workspaceId={workspaceId}
          baseStrategyId={comparisonState.baseStrategyId}
          baseVersionId={comparisonState.baseVersionId}
          targetStrategyId={comparisonState.targetStrategyId}
          targetVersionId={comparisonState.targetVersionId}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-xl border text-left transition-all ${
        active
          ? "bg-[#FF7722]/10 border-[#FF7722] shadow-sm"
          : "bg-[var(--surface-alt)] border-[var(--border)] hover:border-[var(--text-muted)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className="text-base font-bold font-mono text-[var(--text)] mt-1">{value}</div>
    </button>
  );
}
