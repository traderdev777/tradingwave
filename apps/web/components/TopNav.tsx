"use client";

import React from "react";
import { UserProfile, WorkspaceItem } from "../lib/api";
import { Building2, ChevronDown, Clock, LogOut, ShieldAlert, User } from "lucide-react";

interface TopNavProps {
  user: UserProfile | null;
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  onSelectWorkspace: (ws: WorkspaceItem) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function TopNav({
  user,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onOpenAuth,
  onLogout,
}: TopNavProps) {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#090d16]/95 backdrop-blur px-6 flex items-center justify-between z-10">
      {/* Left: Active Workspace Selector */}
      <div className="flex items-center gap-4">
        {user && activeWorkspace ? (
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs text-slate-200 transition-all">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">{activeWorkspace.name}</span>
              <span className="text-[10px] text-slate-400 uppercase font-mono px-1 rounded bg-slate-800">
                {activeWorkspace.plan_code}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown for multiple workspaces */}
            {workspaces.length > 1 && (
              <div className="absolute left-0 mt-1 w-56 rounded-lg bg-slate-900 border border-slate-800 shadow-xl hidden group-hover:block p-1.5 z-50">
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase">
                  Select Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${
                      ws.id === activeWorkspace.id
                        ? "bg-cyan-950/70 text-cyan-300 font-medium"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span>{ws.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{ws.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Guest Mode (Unauthenticated)</span>
        )}

        {/* Live Safety Gate Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-900/60 text-amber-400 text-[11px] font-mono">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span>Live Broker Routing: Disabled</span>
        </div>
      </div>

      {/* Right: Indian Market Status & User Profile */}
      <div className="flex items-center gap-4">
        {/* Market Clock Status */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>NSE / BSE: Closed (Market Hours: 09:15 - 15:30 IST)</span>
        </div>

        {/* Profile / Auth Button */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 rounded-full bg-cyan-900/80 border border-cyan-700 flex items-center justify-center font-bold text-cyan-200 text-xs">
                {user.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <span className="block font-medium text-slate-200">{user.display_name}</span>
                <span className="block text-[10px] text-slate-500">{user.email}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Log Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-950 transition-all"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </header>
  );
}
