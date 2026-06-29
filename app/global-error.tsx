"use client";

import { RefreshCw } from "lucide-react";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          margin: 0,
          padding: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>
            Critical error
          </h1>
          <p style={{ color: "#64748b", marginBottom: 32, lineHeight: 1.6 }}>
            CollabDocs encountered a fatal error. Your locally-stored documents are safe in IndexedDB.
          </p>
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
