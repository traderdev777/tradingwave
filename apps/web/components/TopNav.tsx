"use client";

import React from "react";
import { UserProfile, WorkspaceItem } from "../lib/api";
import {
  Building2,
  ChevronDown,
  Clock,
  LogOut,
  Moon,
  ShieldAlert,
  Sun,
  User,
  Search,
  Bell,
  HelpCircle,
} from "lucide-react";

interface TopNavProps {
  user: UserProfile | null;
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onSelectWorkspace: (ws: WorkspaceItem) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function TopNav({
  user,
  workspaces,
  activeWorkspace,
  isDarkTheme,
  onToggleTheme,
  onSelectWorkspace,
  onOpenAuth,
  onLogout,
}: TopNavProps) {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--surface)] px-6 flex items-center justify-between z-10 transition-colors">
      {/* Left: Active Workspace Selector */}
      <div className="flex items-center gap-4">
        {user && activeWorkspace ? (
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-[#D9690F] text-xs text-[var(--text)] transition-all">
              <Building2 className="w-3.5 h-3.5 text-[#D9690F]" />
              <span className="font-semibold">{activeWorkspace.name}</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono px-1 rounded bg-[var(--surface)] border border-[var(--border)]">
                {activeWorkspace.plan_code}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>

            {/* Dropdown for multiple workspaces */}
            {workspaces.length > 1 && (
              <div className="absolute left-0 mt-1 w-56 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-xl hidden group-hover:block p-1.5 z-50">
                <div className="px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase">
                  Select Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                      ws.id === activeWorkspace.id
                        ? "bg-[#D9690F]/15 text-[#D9690F] font-semibold"
                        : "text-[var(--text)] hover:bg-[var(--border)]/40"
                    }`}
                  >
                    <span>{ws.name}</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {ws.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)] font-medium">
            Guest Mode (Unauthenticated)
          </span>
        )}

        {/* Live Safety Gate Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-mono">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Live Broker Routing: Disabled</span>
        </div>
      </div>

      {/* Right: Indian Market Status, Theme Toggle, & Profile */}
      <div className="flex items-center gap-3">
        {/* Market Clock Status for NSE/BSE & MCX */}
        <div className="hidden lg:flex items-center gap-2.5 text-xs text-[var(--text-muted)] bg-[var(--bg)] px-3 py-1.5 rounded-full border border-[var(--border)]">
          <Clock className="w-3.5 h-3.5 text-[#D9690F]" />
          <span className="font-mono text-[11px]">
            <span className="font-semibold text-[var(--text)]">NSE/BSE</span> 09:15-15:30
            <span className="mx-1.5 text-[var(--border)]">|</span>
            <span className="font-semibold text-[var(--text)]">MCX</span> 09:00-23:30 IST
          </span>
        </div>

        {/* Global Search Shortcut */}
        <div className="hidden xl:flex items-center gap-2 bg-[var(--bg)] px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] cursor-pointer hover:border-[#D9690F] transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Search strategies, symbols, docs...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
            ⌘K
          </kbd>
        </div>

        {/* Notifications Alert Bell */}
        <div className="relative">
          <button
            title="Notifications & System Safeguards"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-[#D9690F] absolute top-1.5 right-1.5" />
          </button>
        </div>

        {/* Help Link */}
        <button
          title="Platform Documentation & SEBI Guides"
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors hidden sm:block"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          title={isDarkTheme ? "Switch to Light Theme" : "Switch to Dark Theme"}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
          aria-label="Toggle theme"
        >
          {isDarkTheme ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* User Profile / Auth Button */}
        {user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-[var(--border)]">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 rounded-full bg-[#D9690F] flex items-center justify-center font-bold text-white text-xs shadow-sm">
                {user.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <span className="block font-semibold text-[var(--text)]">
                  {user.display_name}
                </span>
                <span className="block text-[10px] text-[var(--text-muted)]">
                  {user.email}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Log Out"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--loss)] hover:bg-[var(--loss)]/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] hover:opacity-90 text-[var(--primary-text)] font-semibold text-xs shadow-sm transition-all"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </header>
  );
}
