"use client";

import Link from "next/link";
import { FileText, Trash2, Users, Crown, Eye, Edit3, MoreVertical, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { formatRelative, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DocumentMeta } from "@/types";

interface DocumentCardProps {
  document: DocumentMeta;
  onDelete: (id: string) => void;
}

const ROLE_CONFIG = {
  owner: { icon: Crown, label: "Owner", className: "text-amber-600" },
  editor: { icon: Edit3, label: "Editor", className: "text-blue-600" },
  viewer: { icon: Eye, label: "Viewer", className: "text-muted-foreground" },
};

export function DocumentCard({ document: doc, onDelete }: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const role = ROLE_CONFIG[doc.myRole];
  const RoleIcon = role.icon;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="group relative border border-border rounded-xl bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden">
      <Link
        href={`/documents/${doc.id}`}
        className="block p-5"
        aria-label={`Open ${doc.title}`}
      >
        {/* Icon + title */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
            <FileText size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{doc.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">by {doc.ownerName}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={cn("flex items-center gap-1 font-medium", role.className)}>
            <RoleIcon size={11} />
            {role.label}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            {doc.collaboratorCount}
          </span>
          {(doc.wordCount ?? 0) > 0 && (
            <span>{(doc.wordCount ?? 0).toLocaleString()} words</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
          <Clock size={10} />
          <span>{formatRelative(doc.updatedAt)}</span>
        </div>
      </Link>

      {/* Context menu (owner only) */}
      {doc.myRole === "owner" && (
        <div className="absolute top-3 right-3" ref={menuRef}>
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Document options"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-background border border-border rounded-xl shadow-lg py-1 z-10 animate-fade-in">
              <button
                onClick={() => {
                  toast.promise(
                    new Promise<void>((resolve, reject) => {
                      const result = onDelete(doc.id);
                      Promise.resolve(result).then(() => resolve()).catch(reject);
                    }),
                    {
                      loading: "Deleting…",
                      success: `"${doc.title}" deleted`,
                      error: "Failed to delete document",
                    }
                  );
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
