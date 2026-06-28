"use client";
/**
 * DocumentEditor — the core local-first collaborative editor.
 *
 * Architecture:
 *  - Y.Doc is the single source of truth (local-first)
 *  - IndexeddbPersistence (y-indexeddb) makes changes durable offline
 *  - WebsocketProvider (y-websocket) syncs with collaborators when online
 *  - Tiptap renders the Y.XmlFragment via the Collaboration extension
 *
 * Conflict resolution is deterministic: Y.js CRDT (YATA algorithm) guarantees
 * that concurrent edits from different clients produce the same final state
 * regardless of the order updates arrive. No manual merging needed.
 */

import { useEffect, useRef, useState, useCallback, DragEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import type { UserRole, SyncStatus } from "@/types";
import { EditorToolbar } from "./EditorToolbar";
import { CollaboratorPresence } from "./CollaboratorPresence";
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";

interface DocumentEditorProps {
  documentId: string;
  initialTitle: string;
  myRole: UserRole;
  onTitleChange?: (title: string) => void;
  onWordCountChange?: (count: number) => void;
  className?: string;
}

// Deterministic per-user cursor color
const COLORS = ["#7C3AED","#2563EB","#059669","#D97706","#DC2626","#0891B2","#DB2777"];
function userColorFromId(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

interface AwarenessState {
  user: { name: string; color: string; userId: string };
}

export function DocumentEditor({
  documentId,
  initialTitle,
  myRole,
  onTitleChange,
  onWordCountChange,
}: DocumentEditorProps) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const wsProviderRef = useRef<WebsocketProvider | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: "connecting", pendingOps: 0 });
  const [awarenessUsers, setAwarenessUsers] = useState<AwarenessState[]>([]);
  const [localSynced, setLocalSynced] = useState(false); // IndexedDB loaded
  const [title, setTitle] = useState(initialTitle);
  const [isDragOver, setIsDragOver] = useState(false);
  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReadOnly = myRole === "viewer";

  // ─── Initialize Y.Doc once ─────────────────────────────────────────────────
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Step 1: Load from IndexedDB first (local-first, zero network blocking)
    const persistence = new IndexeddbPersistence(`doc-${documentId}`, ydoc);
    persistenceRef.current = persistence;

    persistence.on("synced", () => {
      setLocalSynced(true);
    });

    // Step 2: Connect WebSocket for real-time sync (non-blocking)
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";

    const fetchWsToken = async () => {
      try {
        const res = await fetch("/api/auth/ws-token");
        const json = await res.json();
        return json.data?.token as string | undefined;
      } catch {
        return undefined;
      }
    };

    fetchWsToken().then((token) => {
      if (!token) {
        setSyncStatus({ state: "error", pendingOps: 0, error: "Auth token unavailable" });
        return;
      }

      const provider = new WebsocketProvider(
        `${wsUrl}/doc`,
        documentId,
        ydoc,
        { params: { token } }
      );
      wsProviderRef.current = provider;

      provider.on("status", ({ status }: { status: string }) => {
        setSyncStatus((prev) => ({
          ...prev,
          state: status === "connected" ? "synced" : status === "connecting" ? "connecting" : "offline",
        }));
      });

      provider.on("sync", (isSynced: boolean) => {
        setSyncStatus((prev) => ({ ...prev, state: isSynced ? "synced" : "syncing" }));
      });

      // Track awareness (who's online)
      provider.awareness.on("change", () => {
        const states: AwarenessState[] = [];
        provider.awareness.getStates().forEach((state) => {
          if (state?.user) states.push(state as AwarenessState);
        });
        setAwarenessUsers(states);
      });

      // Announce presence
      const userId = documentId + "-" + Math.random().toString(36).slice(2, 8);
      provider.awareness.setLocalStateField("user", {
        name: "You",
        color: userColorFromId(userId),
        userId,
      });
    });

    return () => {
      wsProviderRef.current?.destroy();
      persistenceRef.current?.destroy();
      ydoc.destroy();
    };
  }, [documentId]);

  // ─── Tiptap editor (waits for local IndexedDB sync before rendering) ────────
  const editor = useEditor(
    {
      editable: !isReadOnly,
      extensions: [
        // History is disabled at the options level — Y.js CRDT manages undo/redo
        StarterKit.configure({}),
        Collaboration.configure({
          // Y.XmlFragment named 'default' per Y.js convention
          fragment: ydocRef.current
            ? ydocRef.current.getXmlFragment("default")
            : new Y.Doc().getXmlFragment("default"),
        }),
        Placeholder.configure({
          placeholder: isReadOnly
            ? "This document is read-only."
            : "Start writing… (Cmd+K for AI assist)",
        }),
        Highlight.configure({ multicolor: true }),
        Typography,
        Underline,
        Link.configure({ openOnClick: false, autolink: true }),
        Image.configure({ inline: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        CharacterCount,
      ],
      onUpdate: ({ editor }) => {
        const wordCount = editor.storage.characterCount?.words() ?? 0;
        onWordCountChange?.(wordCount);
      },
    },
    [localSynced] // re-init editor once IndexedDB has loaded to avoid race
  );

  // ─── Title inline edit ─────────────────────────────────────────────────────
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTitle(val);
      if (titleDebounce.current) clearTimeout(titleDebounce.current);
      titleDebounce.current = setTimeout(() => {
        onTitleChange?.(val || "Untitled");
      }, 800);
    },
    [onTitleChange]
  );

  // ─── Image / file drag-and-drop into editor ────────────────────────────────
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, [isReadOnly]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only clear when leaving the outer container (not child elements)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (isReadOnly || !editor) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));

      if (imageFiles.length === 0) return;

      imageFiles.forEach((file) => {
        if (file.size > 5 * 1024 * 1024) {
          // 5 MB hard cap — keeps Y.js state reasonable
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = ev.target?.result as string;
          if (!src) return;
          editor.chain().focus().setImage({ src, alt: file.name }).run();
        };
        reader.readAsDataURL(file);
      });
    },
    [editor, isReadOnly]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          {/* Document title */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            disabled={isReadOnly}
            placeholder="Untitled Document"
            className={[
              "flex-1 text-xl font-semibold bg-transparent outline-none",
              "placeholder:text-muted-foreground truncate",
              isReadOnly ? "cursor-default opacity-70" : "hover:bg-muted/50 rounded px-2 -mx-2 py-1",
            ].join(" ")}
            aria-label="Document title"
          />

          <div className="flex items-center gap-3 flex-shrink-0">
            <CollaboratorPresence users={awarenessUsers} />
            <SyncStatusIndicator status={syncStatus} />
            {isReadOnly && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                View only
              </span>
            )}
          </div>
        </div>

        {/* Editor toolbar (hidden for viewers) */}
        {!isReadOnly && editor && (
          <div className="max-w-5xl mx-auto px-4 pb-2">
            <EditorToolbar editor={editor} documentId={documentId} />
          </div>
        )}
      </div>

      {/* Editor content area with drag-and-drop zone */}
      <div
        className="flex-1 overflow-y-auto relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-4 border-2 border-dashed border-blue-400 rounded-2xl bg-blue-50/80 backdrop-blur-sm" />
            <div className="relative flex flex-col items-center gap-2 text-blue-600">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                </svg>
              </div>
              <p className="font-semibold text-base">Drop image to insert</p>
              <p className="text-sm text-blue-500">PNG, JPG, GIF, WebP — max 5 MB</p>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto">
          {!localSynced ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm">Loading document…</p>
              </div>
            </div>
          ) : (
            <EditorContent
              editor={editor}
              className="min-h-screen"
              aria-label="Document content"
              aria-readonly={isReadOnly}
            />
          )}
        </div>
      </div>

      {/* Word count footer */}
      {editor && (
        <div className="border-t border-border bg-background/80 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-1 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{editor.storage.characterCount?.words() ?? 0} words</span>
            <span>{editor.storage.characterCount?.characters() ?? 0} characters</span>
            {isReadOnly && <span className="ml-auto text-amber-600 font-medium">Read-only</span>}
          </div>
        </div>
      )}
    </div>
  );
}
