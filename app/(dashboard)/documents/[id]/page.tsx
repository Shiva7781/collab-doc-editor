"use client";

import { use, useState, useCallback } from "react";
import { ArrowLeft, Share2, History, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { VersionHistoryPanel } from "@/components/editor/VersionHistoryPanel";
import { ShareDocumentDialog } from "@/components/documents/ShareDocumentDialog";
import { Footer } from "@/components/layout/Footer";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { useDocument } from "@/hooks/useDocument";
import { Header } from "@/components/layout/Header";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DocumentPage({ params }: PageProps) {
  const { id } = use(params);
  const { document, loading, error, updateTitle } = useDocument(id);
  const { enqueueOp } = useSyncEngine();
  const [showVersions, setShowVersions] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const handleTitleChange = useCallback(
    async (title: string) => {
      try {
        await updateTitle(title);
      } catch {
        // If offline, queue the operation
        await enqueueOp({
          type: "title_update",
          documentId: id,
          payload: { title },
        });
        toast.info("Title queued — will sync when back online");
      }
    },
    [id, updateTitle, enqueueOp]
  );

  const handleWordCountChange = useCallback(
    async (count: number) => {
      // Fire-and-forget word count update (not critical for offline queue)
      try {
        await fetch(`/api/documents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wordCount: count }),
        });
      } catch {
        // OK to drop — cosmetic only
      }
    },
    [id]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle size={36} className="mx-auto text-destructive" />
          <p className="font-medium">{error ?? "Document not found"}</p>
          <Link href="/documents" className="text-sm text-primary hover:underline">
            ← Back to documents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Custom minimal header for editor */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="px-4 h-12 flex items-center justify-between gap-3">
          <Link
            href="/documents"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Back to documents"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Documents</span>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowVersions((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                showVersions
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Version history"
              aria-expanded={showVersions}
            >
              <History size={13} />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label="Share document"
            >
              <Share2 size={13} />
              Share
            </button>
          </div>
        </div>
      </header>

      {/* Main editor area */}
      <main className="flex-1 relative">
        <DocumentEditor
          documentId={id}
          initialTitle={document.title}
          myRole={document.myRole}
          onTitleChange={handleTitleChange}
          onWordCountChange={handleWordCountChange}
        />

        {/* Version history slide-over */}
        {showVersions && (
          <VersionHistoryPanel
            documentId={id}
            myRole={document.myRole}
            onClose={() => setShowVersions(false)}
            onRestored={() => window.location.reload()}
          />
        )}
      </main>

      {/* Share dialog */}
      {showShare && (
        <ShareDocumentDialog
          documentId={id}
          myRole={document.myRole}
          onClose={() => setShowShare(false)}
        />
      )}

      <Footer />
    </div>
  );
}
