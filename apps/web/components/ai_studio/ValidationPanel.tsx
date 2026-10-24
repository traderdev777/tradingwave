"use client";

import React, { useState } from "react";
import {
  SaveStrategyResponse,
  StrategySpec,
  ValidationReport,
} from "../../lib/api";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Save,
  FlaskConical,
  PlayCircle,
  ShieldAlert,
  Download,
  BookOpen,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

interface ValidationPanelProps {
  spec: StrategySpec;
  validation: ValidationReport | null;
  howItWorks: string[];
  failureModes: string[];
  saving: boolean;
  backtesting: boolean;
  paperStarting: boolean;
  onSaveStrategy: () => void;
  onTriggerBacktest: () => void;
  onTriggerPaperSession: () => void;
  lastSavedVersion?: SaveStrategyResponse | null;
}

export function ValidationPanel({
  spec,
  validation,
  howItWorks,
  failureModes,
  saving,
  backtesting,
  paperStarting,
  onSaveStrategy,
  onTriggerBacktest,
  onTriggerPaperSession,
  lastSavedVersion,
}: ValidationPanelProps) {
  const [copiedSpec, setCopiedSpec] = useState(false);

  function handleExportSpec() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(spec, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${spec.symbol}_${spec.timeframe}_strategy.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  }

  const canDeploy = validation ? validation.can_backtest : true;

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[var(--border)] bg-[var(--bg)]/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {validation?.can_backtest ? (
            <div className="p-1 rounded-lg bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1 rounded-lg bg-red-500/15 text-red-500">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
          <div>
            <span className="text-xs font-bold text-[var(--text)] tracking-tight block">Pre-Flight Validation</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              {validation
                ? `${validation.error_count} Errors • ${validation.warning_count} Warnings`
                : "Engine ready"}
            </span>
          </div>
        </div>

        {/* Export Spec Action */}
        <button
          onClick={handleExportSpec}
          title="Export JSON Strategy Specification"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors text-xs flex items-center gap-1 font-mono text-[11px]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>JSON</span>
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Status Banner */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            canDeploy
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-500"
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-[11px]">
            {canDeploy ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{canDeploy ? "SPECIFICATION VALIDATED" : "BLOCKING ERRORS DETECTED"}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] border border-current">
            {spec.lifecycle_state || "VALIDATED"}
          </span>
        </div>

        {/* Validation Issues Checklist */}
        {validation?.issues && validation.issues.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
              Static Analysis Diagnostics ({validation.issues.length}):
            </span>
            <div className="space-y-2">
              {validation.issues.map((iss, idx) => {
                const isErr = iss.severity === "ERROR";
                const isWarn = iss.severity === "WARNING";

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                      isErr
                        ? "bg-red-500/10 border-red-500/30 text-red-500"
                        : isWarn
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                        : "bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        {isErr ? (
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : isWarn ? (
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <Info className="w-3.5 h-3.5 text-[#FF7722] flex-shrink-0" />
                        )}
                        <span className="font-mono text-[10px]">{iss.code}</span>
                      </div>
                      {iss.blocks_testing && (
                        <span className="text-[9px] uppercase px-1 rounded bg-red-500/20 text-red-500 font-mono font-bold">
                          Blocks Backtest
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-[var(--text)]">{iss.message}</p>
                    <p className="text-[9px] text-[var(--text-muted)] italic">
                      Tip: {iss.suggested_correction}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Explainability: How This Strategy Works */}
        {howItWorks.length > 0 && (
          <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
            <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#FF7722]" />
              <span>How This Strategy Works</span>
            </span>
            <div className="space-y-1.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
              {howItWorks.map((step, idx) => (
                <div key={idx} className="flex gap-1.5">
                  <span className="text-[#FF7722] font-mono font-bold">•</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explainability: Potential Failure Modes */}
        {failureModes.length > 0 && (
          <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2">
            <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Potential Failure Modes & Risks</span>
            </span>
            <div className="space-y-1.5 text-[10px] text-[var(--text-muted)] leading-relaxed">
              {failureModes.map((risk, idx) => (
                <div key={idx} className="flex gap-1.5">
                  <span className="text-amber-500 font-mono font-bold">!</span>
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Saved Version Info */}
        {lastSavedVersion && (
          <div className="p-3 rounded-xl bg-[var(--bg)] border border-emerald-500/30 text-[11px] space-y-1">
            <div className="flex items-center justify-between text-emerald-500 font-bold">
              <span>Saved Version #{lastSavedVersion.version_number}</span>
              <span className="font-mono text-[9px] text-[var(--text-muted)]">
                {lastSavedVersion.specification_hash.slice(0, 10)}...
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              Persisted in database. Ready for historical backtesting or paper trading execution.
            </p>
          </div>
        )}
      </div>

      {/* Deployment & Action Toolbar */}
      <div className="p-3.5 border-t border-[var(--border)] bg-[var(--bg)]/50 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Save Strategy Version */}
          <button
            type="button"
            onClick={onSaveStrategy}
            disabled={saving}
            className="w-full py-2 px-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)]/40 border border-[var(--border)] text-[var(--text)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-[#FF7722]" />
            )}
            <span>Save Version</span>
          </button>

          {/* Trigger Backtest */}
          <button
            type="button"
            onClick={onTriggerBacktest}
            disabled={!canDeploy || backtesting}
            className="w-full py-2 px-3 rounded-xl bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {backtesting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FlaskConical className="w-3.5 h-3.5" />
            )}
            <span>Run Backtest</span>
          </button>
        </div>

        {/* Paper Trading Simulation Action */}
        <button
          type="button"
          onClick={onTriggerPaperSession}
          disabled={!canDeploy || paperStarting}
          className="w-full py-2 px-3 rounded-xl bg-[var(--profit)]/15 hover:bg-[var(--profit)]/25 text-[var(--profit)] border border-[var(--profit)]/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {paperStarting ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <PlayCircle className="w-3.5 h-3.5" />
          )}
          <span>Launch Paper Simulation (Simulated)</span>
        </button>

        {/* SEBI Compliance Lock Warning */}
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-mono">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          <span>SEBI Gate D/E: Live broker order routing locked until certification.</span>
        </div>
      </div>
    </div>
  );
}
