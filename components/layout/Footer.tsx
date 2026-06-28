import { Github, Linkedin, FileText, ExternalLink } from "lucide-react";

export function Footer() {
  const authorName = process.env.NEXT_PUBLIC_AUTHOR_NAME ?? "Shivanand Vishwakarma";
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/Shiva7781";
  const linkedinUrl = process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/shivanand-vishwakarma/";

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <FileText size={12} className="text-primary-foreground" />
          </div>
          <span>
            <span className="font-semibold text-foreground">CollabDocs</span>
            {" "}— Local-first collaborative document editor
          </span>
        </div>

        {/* Author links */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>Built by</span>
          <span className="font-medium text-foreground mx-1">{authorName}</span>
          <span>·</span>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-2"
            aria-label="GitHub profile"
          >
            <Github size={15} />
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink size={10} className="opacity-50" />
          </a>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-3"
            aria-label="LinkedIn profile"
          >
            <Linkedin size={15} />
            <span className="hidden sm:inline">LinkedIn</span>
            <ExternalLink size={10} className="opacity-50" />
          </a>
        </div>
      </div>
    </footer>
  );
}
