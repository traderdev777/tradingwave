"use client";

import React, { useState, useEffect } from "react";
import {
  api,
  StrategyTemplateItem,
  WorkspaceItem,
} from "../../lib/api";
import {
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Target,
  Sparkles,
  GitFork,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
  X,
} from "lucide-react";

interface TemplateCatalogViewProps {
  workspace: WorkspaceItem | null;
  onUseTemplate: (template: StrategyTemplateItem) => void;
}

export function TemplateCatalogView({
  workspace,
  onUseTemplate,
}: TemplateCatalogViewProps) {
  const [templates, setTemplates] = useState<StrategyTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<StrategyTemplateItem | null>(null);

  const categories = [
    { id: "ALL", label: "All Templates" },
    { id: "ORB", label: "Opening Range Breakout" },
    { id: "TREND_FOLLOWING", label: "Trend Following" },
    { id: "MOMENTUM", label: "Momentum" },
    { id: "MEAN_REVERSION", label: "Mean Reversion" },
  ];

  useEffect(() => {
    async function loadTemplates() {
      if (!workspace) return;
      setLoading(true);
      try {
        const data = await api.getTemplates(workspace.id, {
          category: selectedCategory === "ALL" ? undefined : selectedCategory,
        });
        setTemplates(data);
      } catch (err) {
        console.error("Failed to load strategy templates:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, [workspace, selectedCategory]);

  const filtered = templates.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      t.supported_instruments.some((inst) => inst.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 select-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === c.id
                  ? "bg-[#FF7722] text-white shadow-sm"
                  : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search templates, indicators, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF7722]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-[var(--text-muted)] hover:text-[var(--text)] text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Templates */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl bg-[var(--surface)] border border-[var(--border)] animate-pulse p-5"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <BookOpen className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[var(--text)]">No Templates Found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            No strategy templates matched your current category or search filters.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("ALL");
              setSearchQuery("");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30 hover:bg-[#FF7722]/25"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filtered.map((tmpl) => (
            <div
              key={tmpl.template_id}
              className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[#FF7722]/50 hover:shadow-lg hover:shadow-[#FF7722]/5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5">
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30">
                    {tmpl.category}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                      tmpl.trading_mode === "BTST"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/25"
                    }`}
                  >
                    {tmpl.trading_mode}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-[var(--text)] group-hover:text-[#FF7722] transition-colors mb-1.5">
                  {tmpl.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed mb-4">
                  {tmpl.description}
                </p>

                {/* Rule Highlights */}
                <div className="space-y-2 py-2.5 px-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[11px] mb-4">
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">
                      Entry Rule
                    </span>
                    <span className="text-[var(--text)] line-clamp-2 leading-snug">
                      {tmpl.entry_logic_summary}
                    </span>
                  </div>

                  <div className="border-t border-[var(--border)] pt-2">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">
                      Exit & Risk
                    </span>
                    <span className="text-[var(--text)] line-clamp-1 leading-snug">
                      {tmpl.exit_logic_summary}
                    </span>
                  </div>
                </div>

                {/* Supported Instruments */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {tmpl.supported_instruments.map((inst, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)]"
                    >
                      {inst}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-3.5 bg-[var(--bg)]/50 border-t border-[var(--border)] flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewTemplate(tmpl)}
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1"
                >
                  <span>Preview Rules</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onUseTemplate(tmpl)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#FF7722] hover:bg-[#FF7722]/90 text-white shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>Use Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Detail / Preview Drawer */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30 mb-1 inline-block">
                  {previewTemplate.category}
                </span>
                <h2 className="text-base font-bold text-[var(--text)]">
                  {previewTemplate.name}
                </h2>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <p className="text-[var(--text-muted)] leading-relaxed">
                {previewTemplate.description}
              </p>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                    Supported Instruments
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {previewTemplate.supported_instruments.map((inst, idx) => (
                      <span key={idx} className="font-mono text-[11px] font-semibold text-[#FF7722]">
                        {inst}
                        {idx < previewTemplate.supported_instruments.length - 1 ? "," : ""}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                    Evaluation Timeframes
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text)]">
                    {previewTemplate.supported_timeframes.join(", ")}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <h4 className="font-bold text-[var(--text)] mb-1 flex items-center gap-1.5 text-xs">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    Entry Logic Specification
                  </h4>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    {previewTemplate.entry_logic_summary}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <h4 className="font-bold text-[var(--text)] mb-1 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    Exit & Pre-Trade Risk Rules
                  </h4>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    {previewTemplate.exit_logic_summary}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                  <h4 className="font-bold text-[var(--text)] mb-1 flex items-center gap-1.5 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-purple-400" />
                    Data Feeds & Known Limitations
                  </h4>
                  <p className="text-[var(--text-muted)] leading-relaxed mb-1">
                    <strong>Feed:</strong> {previewTemplate.required_data}
                  </p>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    <strong>Limitations:</strong> {previewTemplate.known_limitations}
                  </p>
                </div>
              </div>

              {/* Disclaimer alert */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] leading-relaxed">
                <strong>Statutory Notice:</strong> {previewTemplate.backtest_disclaimer}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg)]/50 flex items-center justify-end gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Close
              </button>

              <button
                onClick={() => {
                  const t = previewTemplate;
                  setPreviewTemplate(null);
                  onUseTemplate(t);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FF7722] hover:bg-[#FF7722]/90 text-white shadow-md flex items-center gap-2"
              >
                <span>Create Strategy From Template</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
