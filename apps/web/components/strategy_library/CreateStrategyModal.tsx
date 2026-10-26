"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  GitFork,
  Library,
  Layers,
  ArrowRight,
  AlertCircle,
  Tag,
  Folder,
} from "lucide-react";
import {
  api,
  StrategyFolderItem,
  StrategyLibraryItem,
} from "../../lib/api";

interface CreateStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  folders: StrategyFolderItem[];
  onCreated: (strategy: { id: string; name: string; spec: any }, targetTool: "ai_studio" | "visual_builder") => void;
  onBrowseTemplates: () => void;
}

const POPULAR_INSTRUMENTS = [
  { symbol: "NIFTY", exchange: "NSE" },
  { symbol: "BANKNIFTY", exchange: "NSE" },
  { symbol: "FINNIFTY", exchange: "NSE" },
  { symbol: "SENSEX", exchange: "BSE" },
  { symbol: "CRUDEOIL", exchange: "MCX" },
  { symbol: "RELIANCE", exchange: "NSE" },
];

export function CreateStrategyModal({
  isOpen,
  onClose,
  workspaceId,
  folders,
  onCreated,
  onBrowseTemplates,
}: CreateStrategyModalProps) {
  const [creationMode, setCreationMode] = useState<"ai_studio" | "visual_builder" | "template">("ai_studio");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [symbol, setSymbol] = useState("NIFTY");
  const [exchange, setExchange] = useState("NSE");
  const [tradingMode, setTradingMode] = useState("INTRADAY");
  const [category, setCategory] = useState("Breakout");
  const [folderId, setFolderId] = useState<string>("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creationMode === "template") {
      onClose();
      onBrowseTemplates();
      return;
    }

    if (!name.trim()) {
      setError("Please provide a strategy name.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    try {
      const created = await api.createLibraryStrategy(workspaceId, {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category,
        symbol: symbol.trim().toUpperCase(),
        exchange: exchange.trim().toUpperCase(),
        trading_mode: tradingMode,
        folder_id: folderId || undefined,
        tags: parsedTags,
        source: creationMode === "ai_studio" ? "ai_studio" : "visual_builder",
      });

      onClose();
      onCreated(created, creationMode);
    } catch (err: any) {
      setError(err.message || "Failed to create strategy draft. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text)]">Create New Trading Strategy</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Initialize an algorithmic trading strategy for Indian exchanges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Workflow Selection Cards */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-2">
              Select Creation Workflow
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setCreationMode("ai_studio")}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  creationMode === "ai_studio"
                    ? "bg-[#FF7722]/10 border-[#FF7722] text-[var(--text)] shadow-sm shadow-[#FF7722]/10"
                    : "bg-[var(--bg)]/50 border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#FF7722]/15 flex items-center justify-center text-[#FF7722] mb-2">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-[var(--text)]">Build with AI</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  Natural language prompt to validated rule tree
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode("visual_builder")}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  creationMode === "visual_builder"
                    ? "bg-[#FF7722]/10 border-[#FF7722] text-[var(--text)] shadow-sm shadow-[#FF7722]/10"
                    : "bg-[var(--bg)]/50 border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-500 mb-2">
                  <GitFork className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-[var(--text)]">Build Visually</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  Drag & drop condition groups & parameters
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode("template")}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  creationMode === "template"
                    ? "bg-[#FF7722]/10 border-[#FF7722] text-[var(--text)] shadow-sm shadow-[#FF7722]/10"
                    : "bg-[var(--bg)]/50 border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-500 mb-2">
                  <Library className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-[var(--text)]">From Template</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  Instantiate proven ORB, Supertrend, or EMA logic
                </div>
              </button>
            </div>
          </div>

          {creationMode === "template" ? (
            <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-center space-y-3">
              <Library className="w-8 h-8 text-[#FF7722] mx-auto opacity-90" />
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Explore Canonical Template Catalog</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
                  Browse 8 deterministic strategy blueprints with validated AST condition trees for NSE, BSE, and MCX.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBrowseTemplates();
                }}
                className="px-4 py-2 rounded-xl bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow"
              >
                Open Template Catalog
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {/* Strategy Name & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Strategy Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. BankNifty 15m ORB Multi-Group"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Strategy Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none transition-colors"
                  >
                    <option value="Opening Range Breakout">Opening Range Breakout</option>
                    <option value="Trend Following">Trend Following</option>
                    <option value="Momentum">Momentum</option>
                    <option value="Mean Reversion">Mean Reversion</option>
                    <option value="Breakout">Breakout</option>
                    <option value="Price Action">Price Action</option>
                    <option value="Indicator-Based">Indicator-Based</option>
                    <option value="Multi-Condition">Multi-Condition</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Instrument & Exchange */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                  Instrument & Exchange
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_INSTRUMENTS.map((item) => (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => {
                        setSymbol(item.symbol);
                        setExchange(item.exchange);
                      }}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors ${
                        symbol === item.symbol && exchange === item.exchange
                          ? "bg-[#FF7722]/15 border-[#FF7722] text-[#FF7722] font-semibold"
                          : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {item.symbol} ({item.exchange})
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="Symbol (e.g. NIFTY, CRUDEOIL)"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none uppercase"
                      required
                    />
                  </div>
                  <div>
                    <select
                      value={exchange}
                      onChange={(e) => setExchange(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                    >
                      <option value="NSE">NSE</option>
                      <option value="BSE">BSE</option>
                      <option value="MCX">MCX</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Trading Mode & Folder */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Trading Mode
                  </label>
                  <select
                    value={tradingMode}
                    onChange={(e) => setTradingMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                  >
                    <option value="INTRADAY">Intraday (Square off 15:15 IST)</option>
                    <option value="BTST">BTST (Buy Today Sell Tomorrow)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1 flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    Folder (Optional)
                  </label>
                  <select
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                  >
                    <option value="">No Folder (Root Library)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. index, orb, multi-group, breakout"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief note about rationale, risk parameters, or target market conditions..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none resize-none"
                />
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors"
            >
              Cancel
            </button>
            {creationMode !== "template" && (
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold inline-flex items-center gap-2 shadow transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Initializing Draft...
                  </>
                ) : (
                  <>
                    <span>Create & Launch {creationMode === "ai_studio" ? "AI Studio" : "Visual Builder"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
