"use client";

import { useState, useEffect, useCallback } from "react";
import { X, UserPlus, Trash2, Crown, Edit3, Eye, Loader2, Mail } from "lucide-react";
import { cn, initials, userColor } from "@/lib/utils";
import { toast } from "sonner";
import type { CollaboratorInfo, UserRole } from "@/types";

interface ShareDocumentDialogProps {
  documentId: string;
  myRole: UserRole;
  onClose: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  editor: "Can edit",
  viewer: "Can view",
};

const ROLE_ICONS: Record<UserRole, React.ComponentType<{ size?: number }>> = {
  owner: Crown,
  editor: Edit3,
  viewer: Eye,
};

export function ShareDocumentDialog({ documentId, myRole, onClose }: ShareDocumentDialogProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const isOwner = myRole === "owner";

  const fetchCollaborators = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/collaborators`);
    const json = await res.json();
    if (json.success) setCollaborators(json.data);
    setLoading(false);
  }, [documentId]);

  useEffect(() => { fetchCollaborators(); }, [fetchCollaborators]);

  async function invite() {
    if (!email.trim()) return;
    setInviting(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setEmail("");
      toast.success(`Invited ${email.trim()} as ${role}`);
      await fetchCollaborators();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to invite user";
      setError(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setInviting(false);
    }
  }

  async function removeCollaborator(userId: string, name: string) {
    try {
      await fetch(`/api/documents/${documentId}/collaborators?userId=${userId}`, { method: "DELETE" });
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
      toast.success(`Removed ${name}`, { description: "Collaborator access revoked." });
    } catch {
      toast.error("Failed to remove collaborator", { duration: 5000 });
    }
  }

  async function updateRole(userId: string, newRole: "editor" | "viewer", name: string) {
    try {
      await fetch(`/api/documents/${documentId}/collaborators?userId=${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      setCollaborators((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, role: newRole } : c))
      );
      toast.success(`${name} is now ${newRole === "editor" ? "an editor" : "a viewer"}`);
    } catch {
      toast.error("Failed to update role", { duration: 5000 });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share document"
    >
      <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Share Document</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Invite form */}
          {isOwner && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Invite by email</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => { if (e.key === "Enter") invite(); }}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                    className="flex-1 sm:flex-none text-sm border border-border rounded-lg px-2 py-2 bg-background outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={invite}
                    disabled={inviting || !email.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                    Invite
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )}

          {/* Collaborators list */}
          <div>
            <p className="text-sm font-medium mb-3">
              People with access
              {collaborators.length > 0 && (
                <span className="text-muted-foreground font-normal ml-1">({collaborators.length})</span>
              )}
            </p>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {collaborators.map((c) => {
                  const RoleIcon = ROLE_ICONS[c.role];
                  return (
                    <div key={c.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ backgroundColor: userColor(c.userId) }}
                      >
                        {initials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOwner && c.role !== "owner" ? (
                          <>
                            <select
                              value={c.role}
                              onChange={(e) => updateRole(c.userId, e.target.value as "editor" | "viewer", c.name)}
                              className="text-xs border border-border rounded px-1.5 py-1 bg-background outline-none"
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              onClick={() => removeCollaborator(c.userId, c.name)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Remove ${c.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <span className={cn("flex items-center gap-1 text-xs text-muted-foreground")}>
                            <RoleIcon size={11} />
                            {ROLE_LABELS[c.role]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
