"use client";

import { useState } from "react";
import { Plus, Search, FileText, Loader2, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { useDocuments } from "@/hooks/useDocument";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { toast } from "sonner";

export default function DocumentsPage() {
  const { documents, loading, createDocument, deleteDocument } = useDocuments();
  const { syncStatus } = useSyncEngine();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = search
    ? documents.filter((d) =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.ownerName.toLowerCase().includes(search.toLowerCase())
      )
    : documents;

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
    <div className="min-h-screen flex flex-col">
      <Header
        showNewDoc
        onNewDoc={() => setShowCreate(true)}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">My Documents</h1>
          <p className="text-muted-foreground text-sm">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
            {syncStatus.state === "offline" && (
              <span className="ml-2 text-amber-600 font-medium">• Offline mode</span>
            )}
          </p>
        </div>

        {/* Search + new doc bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-ring"
              aria-label="Search documents"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus size={14} />
            New
          </button>
        </div>

        {/* Create document inline form */}
        {showCreate && (
          <div className="mb-6 border border-primary/30 bg-primary/5 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-primary" />
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <FileText size={28} className="text-muted-foreground" />
            </div>
            {search ? (
              <p className="text-muted-foreground">No documents match &quot;{search}&quot;</p>
            ) : (
              <>
                <p className="text-muted-foreground mb-2">No documents yet</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Create your first document →
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onDelete={deleteDocument} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
