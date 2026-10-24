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

  // Load session on mount
  useEffect(() => {
    async function loadSession() {
      const token = getStoredToken();
      if (!token) return;

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
        }
      } catch (err) {
        console.warn("Session check failed or expired:", err);
        clearStoredToken();
        setUser(null);
        setWorkspaces([]);
        setActiveWorkspace(null);
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
    <div className="flex h-screen bg-[#070b13] text-slate-100 overflow-hidden font-sans">
      {/* Primary Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#090d16] overflow-hidden">
        {/* Top Header */}
        <TopNav
          user={user}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
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
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">AI Strategy Studio</h2>
              <p className="text-xs text-slate-400 max-w-md">
                Convert natural-language strategy descriptions into structured, validated rule specifications for Indian markets.
              </p>
              <span className="inline-block px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-400 text-xs font-mono">
                Phase 3 Module — Specification & LLM Gateway Ready
              </span>
            </div>
          )}

          {currentTab === "visual_builder" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-950/60 border border-blue-800 flex items-center justify-center text-blue-400">
                <GitFork className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Visual Strategy Node Builder</h2>
              <p className="text-xs text-slate-400 max-w-md">
                React Flow node-based editor for indicators (EMA, RSI, Supertrend), conditions, position sizing, and risk stops.
              </p>
              <span className="inline-block px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-blue-400 text-xs font-mono">
                Phase 2 Module — Specification & AST Schema Queued
              </span>
            </div>
          )}

          {currentTab === "backtest_lab" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800 flex items-center justify-center text-purple-400">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Backtest Simulation Lab</h2>
              <p className="text-xs text-slate-400 max-w-md">
                Deterministic event-driven execution runtime on licensed Indian historical Parquet bars with statutory STT, GST, and slippage models.
              </p>
              <span className="inline-block px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-purple-400 text-xs font-mono">
                Phase 4 Module — Parquet Dataset Registry Queued
              </span>
            </div>
          )}

          {currentTab === "paper_trading" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <PlayCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Paper Trading Simulation</h2>
              <p className="text-xs text-slate-400 max-w-md">
                Virtual order-state machine and real-time market data replay with position ledgers and zero live-capital risk.
              </p>
              <span className="inline-block px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-mono">
                Phase 5 Module — Virtual Ledger Queued
              </span>
            </div>
          )}

          {currentTab === "live_trading" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Live Execution Gatekeeper</h2>
              <p className="text-xs text-slate-400 max-w-md">
                Live broker routing is locked. Under SEBI regulations (Feb 2025 Retail Algo circular) and exchange empanelment procedures, live trading cannot activate without verified compliance records.
              </p>
              <span className="inline-block px-2.5 py-1 rounded bg-amber-950/80 border border-amber-900 text-amber-400 text-xs font-mono">
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
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white capitalize">
                {currentTab.replace("_", " ")}
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
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
