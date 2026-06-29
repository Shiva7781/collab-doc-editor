"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to an error reporting service in production
    if (process.env.NODE_ENV === "production") {
      console.error("[CollabDocs Error]", error.message, error.digest);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-red-50/30 p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-100">
          <AlertTriangle size={36} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-muted-foreground mb-2 leading-relaxed">
          An unexpected error occurred. Your data is safe — this is a display error only.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono mb-8">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md shadow-blue-200"
          >
            <RefreshCw size={15} />
            Try again
          </button>
          <Link
            href="/documents"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
          >
            <ArrowLeft size={15} />
            Go to documents
          </Link>
        </div>
      </div>
    </div>
  );
}
