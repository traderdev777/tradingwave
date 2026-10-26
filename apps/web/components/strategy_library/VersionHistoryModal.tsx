"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  History,
  GitCommit,
  CheckCircle2,
  Clock,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  GitCompare,
  ArrowRight,
} from "lucide-react";
import {
  api,
  StrategyLibraryItem,
  StrategyVersionItem,
} from "../../lib/api";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyLibraryItem;
  workspaceId: string;
  onRestored: (strategy: { strategy_id: string; version_id: string; version_number: number; change_summary: string; spec: any }) => void;
  onCompareVersions: (versionAId: string, versionBId: string) => void;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  strategy,
  workspaceId,
  onRestored,
  onCompareVersions,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<StrategyVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    loadVersions();
  }, [isOpen, strategy.id, workspaceId]);

  async function loadVersions() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStrategyVersions(workspaceId, strategy.id);
      // Sort descending by version number
      const sorted = [...data].sort((a, b) => b.version_number - a.version_number);
      setVersions(sorted);
      if (sorted.length >= 2) {
        setSelectedForCompare([sorted[0].version_id, sorted[1].version_id]);
      } else if (sorted.length === 1) {
        setSelectedForCompare([sorted[0].version_id]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load version history.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(versionId: string) {
    if (!confirm("Restore this historical version as a new editable draft?")) return;
    setRestoringId(versionId);
    try {
      const restored = await api.restoreHistoricalVersion(workspaceId, strategy.id, versionId);
      onRestored(restored);
      onClose();
    } catch (err: any) {
      alert("Failed to restore version: " + (err.message || "Unknown error"));
    } finally {
      setRestoringId(null);
    }
  }

  function handleCopyHash(hash: string) {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  }

  function toggleCompareSelection(versionId: string) {
    if (selectedForCompare.includes(versionId)) {
      setSelectedForCompare(selectedForCompare.filter((id) => id !== versionId));
    } else {
      if (selectedForCompare.length >= 2) {
        setSelectedForCompare([selectedForCompare[1], versionId]);
      } else {
        setSelectedForCompare([...selectedForCompare, versionId]);
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text)]">Immutable Version History</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF7722]/15 text-[#FF7722] border border-[#FF7722]/30">
                  {strategy.name}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Cryptographic audit trail of canonical strategy AST specifications & validation reports
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

        {/* Comparison Action Bar if 2 selected */}
        {selectedForCompare.length === 2 && (
          <div className="px-5 py-2.5 bg-[#FF7722]/10 border-b border-[#FF7722]/25 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <GitCompare className="w-4 h-4 text-[#FF7722]" />
              <span className="font-semibold text-[var(--text)]">2 versions selected for comparison</span>
            </div>
            <button
              onClick={() => {
                onClose();
                onCompareVersions(selectedForCompare[0], selectedForCompare[1]);
              }}
              className="px-3 py-1 rounded-lg bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow"
            >
              Compare Specifications
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-6 h-6 rounded-full border-2 border-[#FF7722] border-t-transparent animate-spin" />
              <span className="text-xs text-[var(--text-muted)]">Retrieving immutable version ledger...</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              No historical versions recorded for this strategy yet.
            </div>
          )}

          {!loading && !error && versions.length > 0 && (
            <div className="space-y-3">
              {versions.map((ver) => {
                const isSelected = selectedForCompare.includes(ver.version_id);
                const isCurrent = ver.version_number === strategy.version_number;

                return (
                  <div
                    key={ver.version_id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-[#FF7722] bg-[#FF7722]/5"
                        : "border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--text-muted)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Version badge + summary */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCompareSelection(ver.version_id)}
                          className="mt-1 rounded accent-[#FF7722] cursor-pointer"
                          title="Select for comparison"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]">
                              v{ver.version_number}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-500 border border-green-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Current Active
                              </span>
                            )}
                            <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(ver.created_at).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>

                          {ver.change_summary && (
                            <p className="text-xs text-[var(--text)] mt-1.5 font-medium">
                              {ver.change_summary}
                            </p>
                          )}

                          {/* Specification SHA-256 Hash */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                              AST SHA-256:
                            </span>
                            <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] select-all">
                              {ver.specification_hash ? ver.specification_hash.slice(0, 16) + "..." : "pending"}
                            </code>
                            {ver.specification_hash && (
                              <button
                                type="button"
                                onClick={() => handleCopyHash(ver.specification_hash)}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                                title="Copy full SHA-256 hash"
                              >
                                {copiedHash === ver.specification_hash ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRestore(ver.version_id)}
                            disabled={restoringId === ver.version_id}
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:border-[#FF7722] hover:text-[#FF7722] bg-[var(--bg)] text-xs font-semibold text-[var(--text)] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {restoringId === ver.version_id ? "Restoring..." : "Restore as Draft"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <GitCommit className="w-4 h-4 text-[#FF7722]" />
            <span>Select any two versions above to run side-by-side structural diff</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--border)]/30 text-[var(--text)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
