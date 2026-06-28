import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import Link from "next/link";
import { FileText, Zap, Shield, History, Users, WifiOff, Sparkles } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/documents");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-primary-foreground" />
            </div>
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">CollabDocs</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles size={14} />
            Local-First · Real-Time · Offline-Ready
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Collaborate without{" "}
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              compromise
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            A document editor that works seamlessly offline using Y.js CRDTs, syncs automatically
            when reconnected, and resolves conflicts deterministically — without data loss.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors text-base"
            >
              Start writing for free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors text-base"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: WifiOff,
                title: "Works offline, always",
                desc: "All edits go to IndexedDB first. Zero network requests block the UI. Open, edit, close — network is optional.",
                color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
              },
              {
                icon: Zap,
                title: "Deterministic sync",
                desc: "Y.js CRDT (YATA algorithm) guarantees concurrent edits from multiple offline clients produce the same final state — no manual merging.",
                color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
              },
              {
                icon: History,
                title: "Version time-travel",
                desc: "Capture named snapshots at any point. Restore any version safely without disrupting other active collaborators.",
                color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
              },
              {
                icon: Users,
                title: "Granular access control",
                desc: "Owner, Editor, and Viewer roles. Viewers are blocked at the WebSocket level from pushing any state updates.",
                color: "text-green-600 bg-green-50 dark:bg-green-900/20",
              },
              {
                icon: Shield,
                title: "Security-first",
                desc: "All sync payloads are validated with Zod. Payload size is capped (5 MB) at the WebSocket transport layer to prevent OOM attacks.",
                color: "text-red-600 bg-red-50 dark:bg-red-900/20",
              },
              {
                icon: Sparkles,
                title: "AI writing assistant",
                desc: "Groq-powered Llama 3.3 helps you continue writing, summarize, fix grammar, or rewrite in a different tone — right inside the editor.",
                color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20",
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={18} />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
