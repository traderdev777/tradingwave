export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-400 text-xs font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          TradingWave v1.0 — Architecture Foundation Initialized
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          AI-Powered Algorithmic Trading <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Engineered for Indian Markets
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
          Deterministic strategy creation, visual graph compiler, licensed Indian market historical backtesting, and paper trading with full regulatory compliance gating.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h3 className="font-semibold text-slate-200 text-sm">Gate A: Research</h3>
            <p className="text-xs text-slate-400">
              Visual Strategy Builder & Backtest Lab on licensed Indian data.
            </p>
            <span className="inline-block text-[11px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
              Ready
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h3 className="font-semibold text-slate-200 text-sm">Gate B: Paper Engine</h3>
            <p className="text-xs text-slate-400">
              Virtual order-state machine & real-time simulation replay.
            </p>
            <span className="inline-block text-[11px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
              Ready
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h3 className="font-semibold text-slate-200 text-sm">Gate D/E: Live Broker</h3>
            <p className="text-xs text-slate-400">
              Gated until statutory SEBI and exchange empanelments are certified.
            </p>
            <span className="inline-block text-[11px] font-mono text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800">
              Compliance Locked
            </span>
          </div>
        </div>

        <div className="pt-8 text-xs text-slate-500 border-t border-slate-800/80">
          TradingWave is a software technology provider. TradingWave is not a registered Investment Adviser or Research Analyst. Backtested performance is hypothetical.
        </div>
      </div>
    </main>
  );
}
