"use client";

import React from "react";
import { Link2, ShieldAlert, AlertTriangle, Key, ExternalLink } from "lucide-react";

interface BrokerStatusWidgetProps {
  liveConnected: boolean;
  message: string;
  onNavigateTab: (tabId: string) => void;
}

export function BrokerStatusWidget({ liveConnected, message, onNavigateTab }: BrokerStatusWidgetProps) {
  return (
    <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Broker Connections & Regulatory Gate</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Authorized Indian broker APIs (Zerodha Kite, Angel One, Upstox).
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
          GATE D/E ACTIVE
        </span>
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--text)] block">
              Live Broker Execution Gated
            </span>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
          <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-muted)] block">Broker Integration</span>
            <span className="font-semibold text-[var(--text)]">Disabled in this environment</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-muted)] block">SEBI Standard</span>
            <span className="font-semibold text-[#D9690F]">Feb 2025 Retail Algo</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-muted)] block">Order Routing Mode</span>
            <span className="font-semibold text-emerald-500">Virtual Simulation Only</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-muted)] block">Supported Adapters</span>
            <span className="font-semibold text-[var(--text)]">Kite • SmartAPI • Upstox</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-[var(--text-muted)]">
          Live capital cannot be deployed without exchange empanelment.
        </span>

        <button
          type="button"
          onClick={() => onNavigateTab("broker_connections")}
          className="text-xs font-semibold text-[#D9690F] hover:underline flex items-center gap-1"
        >
          <span>Broker Settings</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
