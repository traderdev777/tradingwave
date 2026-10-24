"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { TopNav } from "../components/TopNav";
import { DashboardView } from "../components/DashboardView";
import { AuthModal } from "../components/AuthModal";
import {
  api,
  clearStoredToken,
  DashboardSummary,
  getStoredToken,
  getStoredWorkspaceId,
  SessionData,
  setStoredWorkspaceId,
  UserProfile,
  WorkspaceItem,
} from "../lib/api";
import { Lock, Sparkles, GitFork, FlaskConical, PlayCircle, ShieldCheck } from "lucide-react";

export default function AppHome() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceItem | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Initialize theme from storage or default to dark
  useEffect(() => {
    const savedTheme = localStorage.getItem("tradingwave_theme");
    const isDark = savedTheme !== "light";
    setIsDarkTheme(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function handleToggleTheme() {
    const nextDark = !isDarkTheme;
    setIsDarkTheme(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tradingwave_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tradingwave_theme", "light");
    }
  }

  // Load session on mount - auto-initializes demo developer session for instant readiness
  useEffect(() => {
    async function loadSession() {
      const token = getStoredToken();
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile.user);
          setWorkspaces(profile.workspaces);

          const storedWsId = getStoredWorkspaceId();
          const initialWs =
            profile.workspaces.find((w) => w.id === storedWsId) || profile.workspaces[0];

          if (initialWs) {
            setActiveWorkspace(initialWs);
            setStoredWorkspaceId(initialWs.id);
            fetchDashboardSummary(initialWs.id);
            return;
          }
        } catch (err) {
          console.warn("Stored session invalid, fallback to instant demo session:", err);
          clearStoredToken();
        }
      }

      // Auto-load instant developer workspace so dashboard is immediately ready
      try {
        const demo = await api.getDemoSession();
        setStoredToken(demo.token.access_token);
        setStoredWorkspaceId(demo.active_workspace.id);
        setUser(demo.user);
        setWorkspaces(demo.workspaces);
        setActiveWorkspace(demo.active_workspace);
        fetchDashboardSummary(demo.active_workspace.id);
      } catch (err) {
        console.error("Failed to load demo workspace session:", err);
      }
    }

    loadSession();
  }, []);

  async function fetchDashboardSummary(wsId: string) {
    setLoadingSummary(true);
    try {
      const summary = await api.getDashboardSummary(wsId);
      setDashboardSummary(summary);
    } catch (err) {
      console.error("Failed to load dashboard summary:", err);
      setDashboardSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }

  function handleAuthSuccess(session: SessionData) {
    setUser(session.user);
    setWorkspaces(session.workspaces);
    setActiveWorkspace(session.active_workspace);
    fetchDashboardSummary(session.active_workspace.id);
  }

  function handleSelectWorkspace(ws: WorkspaceItem) {
    setActiveWorkspace(ws);
    setStoredWorkspaceId(ws.id);
    fetchDashboardSummary(ws.id);
  }

  function handleLogout() {
    clearStoredToken();
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setDashboardSummary(null);
    api.logout().catch(() => {});
  }

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden font-sans transition-colors">
      {/* Primary Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] overflow-hidden">
        {/* Top Header */}
        <TopNav
          user={user}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          isDarkTheme={isDarkTheme}
          onToggleTheme={handleToggleTheme}
          onSelectWorkspace={handleSelectWorkspace}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        {/* Tab Router / View Render */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {currentTab === "dashboard" && (
            <DashboardView
              summary={dashboardSummary}
              loading={loadingSummary}
              onNavigateTab={setCurrentTab}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          )}

          {currentTab === "ai_studio" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D9690F]/15 border border-[#D9690F]/30 flex items-center justify-center text-[#D9690F]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text)]">AI Strategy Studio</h2>
              <p className="text-xs text-[var(--text-muted)] max-w-md">
                Convert natural-language strategy descriptions into structured, validated rule specifications for Indian markets (NSE, BSE & MCX).
              </p>
              <span className="inline-block px-3 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[#D9690F] text-xs font-mono font-semibold">
                Phase 3 Module — Specification & LLM Gateway Ready
              </span>
            </div>
          )}

          {currentTab === "visual_builder" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F6A94B]/15 border border-[#F6A94B]/30 flex items-center justify-center text-[#F6A94B]">
                <GitFork className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text)]">Visual Strategy Node Builder</h2>
              <p className="text-xs text-[var(--text-muted)] max-w-md">
                React Flow node-based editor for indicators (EMA, RSI, Supertrend, VWAP), conditions, and risk stops across NSE, BSE, and MCX.
              </p>
              <span className="inline-block px-3 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[#F6A94B] text-xs font-mono font-semibold">
                Phase 2 Module — Specification & AST Schema Queued
              </span>
            </div>
          )}

          {currentTab === "backtest_lab" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text)]">Backtest Simulation Lab</h2>
              <p className="text-xs text-[var(--text-muted)] max-w-md">
                Deterministic event-driven execution runtime on licensed Indian historical Parquet bars with statutory STT, CTT, GST, and slippage models.
              </p>
              <span className="inline-block px-3 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-purple-500 text-xs font-mono font-semibold">
                Phase 4 Module — Parquet Dataset Registry Queued
              </span>
            </div>
          )}

          {currentTab === "paper_trading" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--profit)]/15 border border-[var(--profit)]/30 flex items-center justify-center text-[var(--profit)]">
                <PlayCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text)]">Paper Trading Simulation</h2>
              <p className="text-xs text-[var(--text-muted)] max-w-md">
                Virtual order-state machine and real-time market data replay with position ledgers and zero live-capital risk.
              </p>
              <span className="inline-block px-3 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--profit)] text-xs font-mono font-semibold">
                Phase 5 Module — Virtual Ledger Queued
              </span>
            </div>
          )}

          {currentTab === "live_trading" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text)]">Live Execution Gatekeeper</h2>
              <p className="text-xs text-[var(--text-muted)] max-w-md">
                Live broker routing is locked. Under SEBI regulations (Feb 2025 Retail Algo circular) and exchange empanelment procedures, live trading cannot activate without verified compliance records.
              </p>
              <span className="inline-block px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-mono font-semibold">
                Compliance Gate D/E Active
              </span>
            </div>
          )}

          {![
            "dashboard",
            "ai_studio",
            "visual_builder",
            "backtest_lab",
            "paper_trading",
            "live_trading",
          ].includes(currentTab) && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-[var(--text)] capitalize">
                {currentTab.replace("_", " ")}
              </h2>
              <p className="text-xs text-[var(--text-muted)] max-w-md">
                This module is scheduled in accordance with the progressive phase rollout blueprint.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
