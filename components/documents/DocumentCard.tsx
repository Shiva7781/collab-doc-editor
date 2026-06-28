"use client";

import Link from "next/link";
import { Trash2, Users, Crown, Eye, Edit3, MoreVertical, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { formatRelative, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DocumentMeta } from "@/types";

interface DocumentCardProps {
  document: DocumentMeta;
  onDelete: (id: string) => void;
  index?: number;
}

const ROLE_CONFIG = {
  owner:  { icon: Crown,  label: "Owner",  className: "text-amber-600",  bg: "bg-amber-100" },
  editor: { icon: Edit3,  label: "Editor", className: "text-blue-600",   bg: "bg-blue-100" },
  viewer: { icon: Eye,    label: "Viewer", className: "text-slate-500",  bg: "bg-slate-100" },
};

// Deterministic card accent gradient from doc ID
const CARD_GRADIENTS = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-rose-500 to-pink-400",
  "from-amber-500 to-orange-400",
  "from-emerald-500 to-teal-400",
  "from-indigo-500 to-blue-400",
  "from-fuchsia-500 to-violet-400",
  "from-sky-500 to-blue-400",
];

function gradientFromId(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return CARD_GRADIENTS[Math.abs(h) % CARD_GRADIENTS.length];
}

function DocInitials(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "D";
}

export function DocumentCard({ document: doc, onDelete, index = 0 }: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const role = ROLE_CONFIG[doc.myRole];
  const RoleIcon = role.icon;
  const gradient = gradientFromId(doc.id);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className="group relative border border-border/60 rounded-2xl bg-white hover:shadow-xl hover:shadow-black/8 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Colored top strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

      <Link href={`/documents/${doc.id}`} className="block p-5" aria-label={`Open ${doc.title}`}>
        {/* Avatar + title */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradient} shadow-md`}>
            <span className="text-white font-bold text-sm">{DocInitials(doc.title)}</span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-sm leading-tight truncate">{doc.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">by {doc.ownerName}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50 mb-3" />

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", role.className, role.bg)}>
            <RoleIcon size={10} />
            {role.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users size={10} />
            {doc.collaboratorCount}
          </span>
          {(doc.wordCount ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground">
              {(doc.wordCount ?? 0).toLocaleString()} w
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={10} />
            {formatRelative(doc.updatedAt)}
          </span>
        </div>
      </Link>

      {/* Context menu */}
      {doc.myRole === "owner" && (
        <div className="absolute top-4 right-3" ref={menuRef}>
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Document options"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white border border-border rounded-xl shadow-lg py-1 z-10 animate-scale-in">
              <button
                onClick={() => {
                  toast.promise(
                    new Promise<void>((resolve, reject) => {
                      Promise.resolve(onDelete(doc.id)).then(() => resolve()).catch(reject);
                    }),
                    { loading: "Deleting…", success: `"${doc.title}" deleted`, error: "Failed to delete" }
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
