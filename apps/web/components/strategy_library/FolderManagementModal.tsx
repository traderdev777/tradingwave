"use client";

import React, { useState } from "react";
import {
  X,
  Folder,
  FolderPlus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Layers,
} from "lucide-react";
import {
  api,
  StrategyFolderItem,
} from "../../lib/api";

interface FolderManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  folders: StrategyFolderItem[];
  onFoldersUpdated: () => void;
}

const FOLDER_COLORS = [
  { name: "Saffron", hex: "#FF7722" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Green", hex: "#10B981" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Gray", hex: "#6B7280" },
];

export function FolderManagementModal({
  isOpen,
  onClose,
  workspaceId,
  folders,
  onFoldersUpdated,
}: FolderManagementModalProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#FF7722");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#FF7722");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await api.createFolder(workspaceId, {
        name: newFolderName.trim(),
        color: newFolderColor,
      });
      setNewFolderName("");
      onFoldersUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to create folder.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(folderId: string) {
    if (!editName.trim()) return;
    setSavingEdit(true);
    setError(null);
    try {
      await api.updateFolder(workspaceId, folderId, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingId(null);
      onFoldersUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to update folder.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(folderId: string, folderName: string) {
    if (!confirm(`Delete folder "${folderName}"? Strategies inside will be unassigned to root library.`)) {
      return;
    }
    setDeletingId(folderId);
    setError(null);
    try {
      await api.deleteFolder(workspaceId, folderId);
      onFoldersUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to delete folder.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF7722]/15 border border-[#FF7722]/30 flex items-center justify-center text-[#FF7722]">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text)]">Manage Strategy Folders</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Organize your strategies into custom workspace folders
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2 text-xs text-red-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* New Folder Form */}
          <form
            onSubmit={handleCreateFolder}
            className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] space-y-3"
          >
            <div className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-[#FF7722]" />
              Create New Folder
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name (e.g. ORB Production, Scalping Lab)"
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={creating || !newFolderName.trim()}
                className="px-4 py-2 rounded-xl bg-[#FF7722] hover:bg-[#E65A00] text-white text-xs font-bold transition-all disabled:opacity-50 whitespace-nowrap shadow"
              >
                {creating ? "Adding..." : "Add Folder"}
              </button>
            </div>

            {/* Color Swatches */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-[var(--text-muted)]">Folder color:</span>
              <div className="flex items-center gap-1.5">
                {FOLDER_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setNewFolderColor(col.hex)}
                    style={{ backgroundColor: col.hex }}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      newFolderColor === col.hex ? "scale-125 ring-2 ring-white/50" : "opacity-75 hover:opacity-100"
                    }`}
                    title={col.name}
                  />
                ))}
              </div>
            </div>
          </form>

          {/* Existing Folders List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[var(--text)] flex items-center justify-between">
              <span>Workspace Folders ({folders.length})</span>
            </div>

            {folders.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
                No folders created yet. Organize strategies by strategy type or asset class.
              </div>
            ) : (
              <div className="space-y-2">
                {folders.map((folder) => {
                  const isEditing = editingId === folder.id;

                  if (isEditing) {
                    return (
                      <div
                        key={folder.id}
                        className="p-3 rounded-xl border border-[#FF7722] bg-[var(--surface-alt)] flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[#FF7722] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(folder.id)}
                          disabled={savingEdit}
                          className="p-1.5 rounded-lg bg-[#FF7722] text-white hover:bg-[#E65A00] transition-colors"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={folder.id}
                      className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] flex items-center justify-between gap-3 group hover:border-[var(--text-muted)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: folder.color || "#FF7722" }}
                        />
                        <span className="text-xs font-semibold text-[var(--text)]">
                          {folder.name}
                        </span>
                        {folder.strategy_count !== undefined && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
                            {folder.strategy_count} {folder.strategy_count === 1 ? "strategy" : "strategies"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(folder.id);
                            setEditName(folder.name);
                            setEditColor(folder.color || "#FF7722");
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]/40 transition-colors"
                          title="Rename Folder"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(folder.id, folder.name)}
                          disabled={deletingId === folder.id}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--border)]/30 text-[var(--text)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
