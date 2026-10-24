"use client";

import React, { useState } from "react";
import { Sparkles, Send, CheckCircle2, AlertCircle, ArrowRight, CornerDownLeft, ShieldAlert } from "lucide-react";
import { api, AIDraftResponse } from "../lib/api";

interface AiAssistantWidgetProps {
  workspaceId: string;
  onNavigateTab: (tabId: string) => void;
}

const EXAMPLE_PROMPTS = [
  "Build an EMA crossover strategy with an RSI filter on Nifty 5-min",
  "MCX Crude Oil opening range breakout with 1.5% profit target",
  "NIFTY 15m Supertrend VWAP Breakout with ATR trailing stop",
  "BankNifty mean reversion scalp when RSI dips below 30",
];

export function AiAssistantWidget({ workspaceId, onNavigateTab }: AiAssistantWidgetProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<AIDraftResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const result = await api.draftAIStrategy(workspaceId, { prompt: prompt.trim() });
      setDraftResult(result);
    } catch (err: any) {
      setError(err.message || "Failed to draft strategy. Please verify your prompt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#FF7722]/15 text-[#FF7722]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">What would you like to build?</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Convert natural language into deterministic rule specifications for NSE, BSE & MCX.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30 uppercase self-start sm:self-auto">
          AI Rule Compiler
        </span>
      </div>

      {/* Input Box */}
      <form onSubmit={handleGenerate} className="space-y-3">
        <div className="relative">
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Build an EMA crossover strategy with an RSI filter on Nifty 5-min..."
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF7722] focus:ring-1 focus:ring-[#FF7722] resize-none pr-12 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="absolute right-2.5 bottom-3.5 p-1.5 rounded-lg bg-[#FF7722] hover:bg-[#E65A00] text-white disabled:opacity-40 transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          <span className="text-[var(--text-muted)] flex-shrink-0 font-medium">Examples:</span>
          {EXAMPLE_PROMPTS.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(ex)}
              className="px-2.5 py-1 rounded-full bg-[var(--bg)] hover:bg-[var(--border)]/40 text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)] text-[10px] whitespace-nowrap transition-colors flex-shrink-0"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {/* Loading Step Progress */}
      {loading && (
        <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <div className="w-5 h-5 border-2 border-[#FF7722] border-t-transparent rounded-full animate-spin" />
          <div className="space-y-0.5">
            <span className="font-semibold text-[var(--text)] block">Synthesizing Strategy Specification...</span>
            <span className="text-[10px] text-[var(--text-muted)] block font-mono">
              Parsing AST • Verifying Indicator Bounds • Enforcing SEBI 15:15 / MCX 23:15 Auto Square-Off
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-xl bg-[var(--loss)]/10 border border-[var(--loss)]/30 text-[var(--loss)] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated Draft Result Card */}
      {draftResult && !loading && (
        <div className="p-4 rounded-xl bg-[var(--bg)] border border-[#FF7722]/40 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-xs text-[var(--text)]">{draftResult.strategy_name}</span>
              <span className="text-[10px] font-mono px-1.5 rounded font-bold bg-[#FF7722]/20 text-[#FF7722]">
                {draftResult.market}:{draftResult.symbol} • {draftResult.timeframe}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">
              {draftResult.validation_status}
            </span>
          </div>

          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            {draftResult.explanation}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1">
              <span className="font-bold text-[var(--text)] block text-[10px] uppercase tracking-wider text-[#FF7722]">
                Entry Conditions:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[var(--text-muted)]">
                {draftResult.entry_rules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] space-y-1">
              <span className="font-bold text-[var(--text)] block text-[10px] uppercase tracking-wider text-[var(--loss)]">
                Exit & Risk Stops:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[var(--text-muted)]">
                {draftResult.exit_rules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-mono">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>AI output cannot trigger live execution directly. Review required.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab("visual_builder")}
                className="px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)]/40 text-[var(--text)] text-xs font-semibold border border-[var(--border)] transition-all"
              >
                Inspect in Visual Builder
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab("backtest_lab")}
                className="px-3 py-1.5 rounded-lg bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
              >
                <span>Run Backtest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
