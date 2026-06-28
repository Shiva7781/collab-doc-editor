"use client";
import { useState, useEffect, useCallback } from "react";
import type { DocumentMeta } from "@/types";

export function useDocument(id: string) {
  const [document, setDocument] = useState<DocumentMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDocument(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const updateTitle = useCallback(
    async (title: string) => {
      setDocument((prev) => (prev ? { ...prev, title } : prev));
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    [id]
  );

  return { document, loading, error, refresh: fetchDocument, updateTitle };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents");
      const json = await res.json();
      if (json.success) setDocuments(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const createDocument = useCallback(async (title: string) => {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    setDocuments((prev) => [json.data, ...prev]);
    return json.data as DocumentMeta;
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { documents, loading, createDocument, deleteDocument, refresh: fetchDocuments };
}
