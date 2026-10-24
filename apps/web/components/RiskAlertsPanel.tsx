"use client";

import React from "react";
import { AlertItem } from "../lib/api";
import { ShieldCheck, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";

interface RiskAlertsPanelProps {
  alerts: AlertItem[];
  onNavigateTab: (tabId: string) => void;
}

export function RiskAlertsPanel({ alerts, onNavigateTab }: RiskAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
        <h4 className="text-xs font-bold text-[var(--text)]">All Safeguards Operational</h4>
        <p className="text-[11px] text-[var(--text-muted)]">
          Zero risk breaches, market-data discrepancies, or broker errors recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#FF7722]" />
          <h3 className="text-sm font-bold text-[var(--text)]">Risk & System Alerts</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30">
          {alerts.length} NOTICES
        </span>
      </div>

      <div className="space-y-2.5">
        {alerts.map((alert) => {
          const isWarning = alert.severity === "warning";
          const isCritical = alert.severity === "critical";

          return (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                isCritical
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : isWarning
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : "bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  {isCritical ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-[#FF7722]" />
                  )}
                  <span>{alert.title}</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--text-muted)]">
                  {alert.resource}
                </span>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {alert.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
