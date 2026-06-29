"use client";

import { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { Sparkles, X, Loader2, CheckCheck, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AIMode = "complete" | "summarize" | "grammar" | "rewrite";

interface AIAssistantProps {
  editor: Editor;
  documentId: string;
  onClose: () => void;
}

const MODES: { key: AIMode; label: string; description: string }[] = [
  { key: "complete", label: "Continue writing", description: "AI continues from where you left off" },
  { key: "summarize", label: "Summarize", description: "Generate a concise summary of this document" },
  { key: "grammar", label: "Fix grammar", description: "Correct grammar and improve clarity" },
  { key: "rewrite", label: "Rewrite", description: "Rewrite selected text in a professional tone" },
];

export function AIAssistant({ editor, documentId, onClose }: AIAssistantProps) {
  const [mode, setMode] = useState<AIMode>("complete");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Close on Escape
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const getContent = () => {
    const { from, to } = editor.state.selection;
    if (from !== to) {
      return editor.state.doc.textBetween(from, to, "\n");
    }
    return editor.state.doc.textContent.slice(0, 6000);
  };

  async function run() {
    setLoading(true);
    setError("");
    setResult("");

    const content = getContent();
    if (!content.trim()) {
      setError("Document is empty. Add some content first.");
      setLoading(false);
      return;
    }

    try {
      const endpoint =
        mode === "complete" ? "/api/ai/complete" :
        mode === "summarize" ? "/api/ai/summarize" :
        "/api/ai/grammar";

      const body: Record<string, string> = { content, documentId };
      if (mode === "complete") body.prompt = prompt;
      if (mode === "grammar") body.mode = "grammar";
      if (mode === "rewrite") { body.mode = "rewrite"; body.tone = "professional"; }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "AI request failed");
      setResult(json.data.result);
      toast.success("AI response ready", { description: "Review and insert or copy below." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get AI response";
      setError(msg);
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  }

  function insertResult() {
    if (!result) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().deleteSelection().insertContent(result).run();
    } else {
      editor.chain().focus().insertContent(result).run();
    }
    toast.success("Inserted into document");
    onClose();
  }

  function copyResult() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      ref={panelRef}
      className="mt-2 border border-border rounded-xl bg-card shadow-lg overflow-hidden animate-fade-in"
      role="dialog"
      aria-label="AI Writing Assistant"
      aria-modal="false"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          <span className="font-medium text-sm">AI Writing Assistant</span>
          <span className="hidden sm:inline text-xs text-muted-foreground">powered by Groq Llama</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          aria-label="Close AI assistant"
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Mode selector */}
        <div className="flex gap-2 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setResult(""); }}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full border transition-colors",
                mode === m.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
              title={m.description}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Prompt input (only for complete mode) */}
        {mode === "complete" && (
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional instruction (e.g., 'write in a formal tone', 'add 2 more paragraphs')…"
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background resize-none outline-none focus:ring-2 focus:ring-ring"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
            }}
          />
        )}

        {/* Generate button */}
        <button
          onClick={run}
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles size={14} />
              {MODES.find((m) => m.key === mode)?.label ?? "Generate"}
              <span className="text-xs opacity-70 ml-1">⌘↵</span>
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">AI Response</div>
            <div className="border border-border rounded-lg bg-muted/30 px-3 py-2 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
              {result}
            </div>
            <div className="flex gap-2">
              <button
                onClick={insertResult}
                className="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <CheckCheck size={13} /> Insert into document
              </button>
              <button
                onClick={copyResult}
                className="flex items-center gap-1 py-1.5 px-3 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
              >
                {copied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
