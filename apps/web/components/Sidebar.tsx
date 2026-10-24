"use client";

import React from "react";
import {
  LayoutDashboard,
  Sparkles,
  GitFork,
  Library,
  FlaskConical,
  PlayCircle,
  ZapOff,
  PieChart,
  Link2,
  Store,
  FileBarChart,
  CreditCard,
  ShieldCheck,
  Sliders,
} from "lucide-react";

interface NavItem {
  name: string;
  id: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: "locked" | "disabled" | "active";
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", id: "dashboard", icon: LayoutDashboard },
  { name: "AI Strategy Studio", id: "ai_studio", icon: Sparkles },
  { name: "Visual Builder", id: "visual_builder", icon: GitFork },
  { name: "Strategy Library", id: "strategy_library", icon: Library },
  { name: "Backtest Lab", id: "backtest_lab", icon: FlaskConical },
  { name: "Paper Trading", id: "paper_trading", icon: PlayCircle },
  {
    name: "Live Trading",
    id: "live_trading",
    icon: ZapOff,
    badge: "Gate D/E Locked",
    badgeVariant: "locked",
  },
  { name: "Portfolio & Risk", id: "portfolio_risk", icon: PieChart },
  { name: "Broker Connections", id: "broker_connections", icon: Link2 },
  {
    name: "Marketplace",
    id: "marketplace",
    icon: Store,
    badge: "Disabled",
    badgeVariant: "disabled",
  },
  { name: "Reports", id: "reports", icon: FileBarChart },
  { name: "Billing", id: "billing", icon: CreditCard },
  { name: "Account & Security", id: "account_security", icon: ShieldCheck },
  { name: "Admin Console", id: "admin_console", icon: Sliders },
];

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
}

export function Sidebar({ currentTab, onSelectTab }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-slate-800 bg-[#070b13] flex flex-col flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center font-bold text-white text-base shadow-lg shadow-cyan-900/30">
          🌊
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-base">TradingWave</span>
          <span className="block text-[10px] text-cyan-400 font-mono tracking-wider">INDIA ALGO SaaS</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Platform Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isLocked = item.badgeVariant === "locked" || item.badgeVariant === "disabled";

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                isActive
                  ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 shadow-sm"
                  : isLocked
                  ? "text-slate-500 hover:text-slate-400 hover:bg-slate-900/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
              <span className="flex-1 truncate">{item.name}</span>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    item.badgeVariant === "locked"
                      ? "bg-amber-950/70 text-amber-400 border border-amber-900/50"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>SEBI Compliance Gate:</span>
          <span className="text-emerald-400 font-mono text-[10px]">Active</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Market:</span>
          <span className="text-slate-400 font-mono text-[10px]">NSE / BSE (IST)</span>
        </div>
      </div>
    </aside>
  );
}
