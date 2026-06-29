import Link from "next/link";
import { FileText, ArrowLeft, Search } from "lucide-react";

export const metadata = { title: "404 — Page Not Found" };

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30 p-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
          <FileText size={15} className="text-white" />
        </div>
        <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          CollabDocs
        </span>
      </div>

      {/* Error content */}
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Search size={36} className="text-blue-500" />
        </div>

        <h1 className="text-7xl font-black bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <h2 className="text-2xl font-bold mb-3">Page not found</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          It might be a private document that requires login.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md shadow-blue-200"
          >
            <ArrowLeft size={15} />
            Back to home
          </Link>
          <Link
            href="/documents"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
          >
            My documents
          </Link>
        </div>
      </div>
    </div>
  );
}
