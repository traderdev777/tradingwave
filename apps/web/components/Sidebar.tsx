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
  TrendingUp,
  FileBarChart,
  CreditCard,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Logo } from "./Logo";

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
  { name: "Visual Strategy Builder", id: "visual_builder", icon: GitFork },
  { name: "Strategy Library", id: "strategy_library", icon: Library },
  { name: "Backtest Lab", id: "backtest_lab", icon: FlaskConical },
  { name: "Paper Trading", id: "paper_trading", icon: PlayCircle },
  {
    name: "Live Trading",
    id: "live_trading",
    icon: ZapOff,
    badge: "Gate D/E",
    badgeVariant: "locked",
  },
  { name: "Portfolio & Risk", id: "portfolio_risk", icon: PieChart },
  { name: "Market Data", id: "market_data", icon: TrendingUp },
  { name: "Broker Connections", id: "broker_connections", icon: Link2 },
  { name: "Reports", id: "reports", icon: FileBarChart },
  { name: "Billing & Plans", id: "billing", icon: CreditCard },
  { name: "Settings", id: "settings", icon: Settings },
  { name: "Help & Documentation", id: "help_docs", icon: HelpCircle },
];

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
}

export function Sidebar({ currentTab, onSelectTab }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col flex-shrink-0 select-none transition-colors">
      {/* Brand Header with Dark Saffron Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
        <Logo size="sm" showWordmark tagline="TRADE BINDAS" />
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Platform
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
                  ? "bg-[#D9690F]/15 text-[#D9690F] border border-[#D9690F]/30 font-semibold shadow-sm"
                  : isLocked
                  ? "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30 opacity-70"
                  : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? "text-[#D9690F]" : "text-[var(--text-muted)]"
                }`}
              />
              <span className="flex-1 truncate">{item.name}</span>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    item.badgeVariant === "locked"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "bg-[var(--border)]/60 text-[var(--text-muted)]"
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
      <div className="p-3 border-t border-[var(--border)] bg-[var(--bg)]/50 text-[11px] text-[var(--text-muted)] space-y-1.5">
        <div className="flex items-center justify-between">
          <span>SEBI Compliance:</span>
          <span className="text-[var(--profit)] font-mono text-[10px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--profit)]" />
            Active
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Markets:</span>
          <span className="font-mono text-[10px] text-[#D9690F] font-bold">NSE • BSE • MCX</span>
        </div>
      </div>
    </aside>
  );
}
