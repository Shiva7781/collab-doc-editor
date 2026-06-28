"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Search, FileText, Loader2, X, LayoutGrid, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SortableDocumentCard } from "@/components/documents/SortableDocumentCard";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { useDocuments } from "@/hooks/useDocument";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { toast } from "sonner";
import type { DocumentMeta } from "@/types";

const ORDER_KEY = "collab-doc-order";

function loadOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) ?? "[]"); } catch { return []; }
}
function saveOrder(ids: string[]) {
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

export default function DocumentsPage() {
  const { documents, loading, createDocument, deleteDocument } = useDocuments();
  const { syncStatus } = useSyncEngine();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [ordered, setOrdered] = useState<DocumentMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  // Merge fetched docs with persisted order
  useEffect(() => {
    if (!documents.length) { setOrdered(documents); return; }
    const saved = loadOrder();
    if (!saved.length) { setOrdered(documents); return; }
    const map = new Map(documents.map((d) => [d.id, d]));
    const reordered = saved.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
    const newDocs = documents.filter((d) => !saved.includes(d.id));
    setOrdered([...reordered, ...newDocs]);
  }, [documents]);

  const filtered = search
    ? ordered.filter((d) =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.ownerName.toLowerCase().includes(search.toLowerCase())
      )
    : ordered;

  const totalWords = documents.reduce((sum, d) => sum + (d.wordCount ?? 0), 0);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrdered((prev) => {
      const oldIdx = prev.findIndex((d) => d.id === active.id);
      const newIdx = prev.findIndex((d) => d.id === over.id);
      const next = arrayMove(prev, oldIdx, newIdx);
      saveOrder(next.map((d) => d.id));
      return next;
    });
    toast.success("Order saved");
  }, []);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const doc = await createDocument(newTitle.trim());
      toast.success(`"${newTitle.trim()}" created`);
      window.location.href = `/documents/${doc.id}`;
    } catch {
      toast.error("Failed to create document");
    } finally {
      setCreating(false);
      setShowCreate(false);
      setNewTitle("");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header showNewDoc onNewDoc={() => setShowCreate(true)} />

      {/* Dashboard hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700">
        {/* Subtle dot grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        {/* Decorative circle */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute right-10 bottom-0 w-40 h-40 bg-white/5 rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="text-white">
            <p className="text-blue-200 text-sm font-medium mb-1">Welcome back</p>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Hey, {firstName} 👋</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100">
              <span className="flex items-center gap-1.5">
                <LayoutGrid size={13} />
                {documents.length} document{documents.length !== 1 ? "s" : ""}
              </span>
              {totalWords > 0 && (
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} />
                  {totalWords.toLocaleString()} words written
                </span>
              )}
              {syncStatus.state === "offline" && (
                <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                  • Offline mode
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg text-sm flex-shrink-0"
          >
            <Plus size={15} />
            New Document
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl bg-white outline-none focus:ring-2 focus:ring-ring shadow-sm"
              aria-label="Search documents"
            />
          </div>
        </div>

        {/* Create document inline form */}
        {showCreate && (
          <div className="mb-6 border border-blue-200 bg-gradient-to-r from-blue-50 to-violet-50 rounded-2xl p-4 animate-fade-in shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200">
                <FileText size={17} className="text-white" />
              </div>
              <input
                autoFocus
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setShowCreate(false); setNewTitle(""); }
                }}
                placeholder="Document title…"
                maxLength={500}
                className="flex-1 text-sm font-medium bg-transparent outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 shadow-sm"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewTitle(""); }}
                className="p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Cancel"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Document grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-violet-100 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={28} className="text-blue-500" />
            </div>
            {search ? (
              <p className="text-muted-foreground">No documents match &quot;{search}&quot;</p>
            ) : (
              <>
                <p className="font-medium mb-1">No documents yet</p>
                <p className="text-muted-foreground text-sm mb-4">Create your first document to get started</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-md shadow-blue-200"
                >
                  <Plus size={14} />
                  Create document
                </button>
              </>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filtered.map((d) => d.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((doc, i) => (
                  <SortableDocumentCard
                    key={doc.id}
                    document={doc}
                    onDelete={deleteDocument}
                    index={i}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Drag overlay — ghost card while dragging */}
            <DragOverlay>
              {activeId ? (
                <div className="rotate-2 scale-105 opacity-90 shadow-2xl rounded-2xl">
                  <DocumentCard
                    document={ordered.find((d) => d.id === activeId)!}
                    onDelete={() => {}}
                    index={0}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      <Footer />
    </div>
  );
}
