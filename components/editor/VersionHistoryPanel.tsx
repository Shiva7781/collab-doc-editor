"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Plus, RotateCcw, X, Clock, User2, HardDrive } from "lucide-react";
import { formatRelative, formatBytes, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DocumentVersion, UserRole } from "@/types";

interface VersionHistoryPanelProps {
  documentId: string;
  myRole: UserRole;
  onClose: () => void;
  onRestored?: () => void;
}

export function VersionHistoryPanel({ documentId, myRole, onClose, onRestored }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<(DocumentVersion & { preview?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  const canWrite = myRole !== "viewer";

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      const json = await res.json();
      if (json.success) setVersions(json.data);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  async function createVersion() {
    if (!newTitle.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDesc }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setVersions((prev) => [json.data, ...prev]);
      toast.success(`Snapshot "${newTitle}" saved`);
      setNewTitle("");
      setNewDesc("");
      setShowCreate(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save snapshot";
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  async function restoreVersion(versionId: string, title: string) {
    toast(`Restore "${title}"?`, {
      action: {
        label: "Restore",
        onClick: async () => {
          setRestoring(versionId);
          setError("");
          try {
            const res = await fetch(`/api/documents/${documentId}/versions/${versionId}`, {
              method: "POST",
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            toast.success("Document restored successfully");
            onRestored?.();
            onClose();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Restore failed";
            setError(msg);
            toast.error(msg);
          } finally {
            setRestoring(null);
          }
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[29] sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
    <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-background border-l border-border shadow-xl z-30 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History size={16} className="text-primary" />
          <span className="font-semibold text-sm">Version History</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* Create version */}
      {canWrite && (
        <div className="px-4 py-3 border-b border-border">
          {showCreate ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Version name (e.g., 'Before refactor')"
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background outline-none focus:ring-2 focus:ring-ring"
                maxLength={200}
                onKeyDown={(e) => { if (e.key === "Enter") createVersion(); if (e.key === "Escape") setShowCreate(false); }}
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background outline-none focus:ring-2 focus:ring-ring"
                maxLength={1000}
              />
              <div className="flex gap-2">
                <button
                  onClick={createVersion}
                  disabled={creating || !newTitle.trim()}
                  className="flex-1 text-xs py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating ? "Saving…" : "Save snapshot"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 text-sm text-primary hover:bg-primary/10 rounded-lg px-3 py-2 transition-colors"
            >
              <Plus size={14} />
              Save current snapshot
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mx-4 mt-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Version list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <History size={32} className="mx-auto mb-2 opacity-30" />
            <p>No snapshots yet.</p>
            {canWrite && <p className="text-xs mt-1">Create one to save this version.</p>}
          </div>
        ) : (
          versions.map((v) => (
            <div key={v.id} className="border border-border rounded-xl p-3 space-y-2 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{v.title}</p>
                  {v.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>
                  )}
                </div>
                {canWrite && (
                  <button
                    onClick={() => restoreVersion(v.id, v.title)}
                    disabled={restoring === v.id}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors",
                      "border-border hover:border-primary/50 hover:text-primary",
                      restoring === v.id && "opacity-50 cursor-not-allowed"
                    )}
                    title="Restore this version"
                  >
                    <RotateCcw size={11} className={cn(restoring === v.id && "animate-spin")} />
                    Restore
                  </button>
                )}
              </div>

              {/* Preview */}
              {v.preview && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 line-clamp-2">
                  {v.preview}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatRelative(v.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <User2 size={10} />
                  {v.createdByName}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive size={10} />
                  {formatBytes(v.snapshotSize)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
}
