import Link from "next/link";
import { FileText } from "lucide-react";

export function Footer() {
  const authorName = process.env.NEXT_PUBLIC_AUTHOR_NAME ?? "Shivanand Vishwakarma";
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/Shiva7781";
  const linkedinUrl = process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/shivanand-vishwakarma/";

  return (
    <footer className="mt-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">

          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                <FileText size={16} className="text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                CollabDocs
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-xs text-center sm:text-left leading-relaxed">
              Local-first collaborative editor — works offline, syncs everywhere.
            </p>
          </div>

          {/* Author + socials */}
          <div className="flex flex-col items-center sm:items-end gap-4">
            <p className="text-slate-400 text-sm">
              Built by{" "}
              <span className="text-white font-semibold">{authorName}</span>
            </p>

            <div className="flex items-center gap-3">
              {/* GitHub */}
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub profile"
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 transition-all duration-200"
              >
                {/* GitHub SVG icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <span className="text-sm text-white font-medium">GitHub</span>
              </a>

              {/* LinkedIn */}
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn profile"
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A66C2]/80 hover:bg-[#0A66C2] border border-[#0A66C2]/50 hover:border-[#0A66C2] transition-all duration-200"
              >
                {/* LinkedIn SVG icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="text-sm text-white font-medium">LinkedIn</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} CollabDocs. Built for House of Edtech Assignment.</span>
          <div className="flex items-center gap-4">
            <Link href="/documents" className="hover:text-slate-300 transition-colors">Dashboard</Link>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">Source</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
