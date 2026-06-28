import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import Link from "next/link";
import { FileText, Zap, Shield, History, Users, WifiOff, Sparkles, ArrowRight, Check } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/documents");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border/60 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
              <FileText size={15} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              CollabDocs
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-md shadow-blue-200"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-100 to-violet-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-violet-100 to-pink-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200/60 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-8 shadow-sm">
              <Sparkles size={13} />
              Local-First · CRDT Sync · Offline-Ready
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Write together,{" "}
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-pink-500 bg-clip-text text-transparent animate-shimmer">
                even offline
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              A collaborative editor that works seamlessly without internet. Y.js CRDTs resolve
              conflicts deterministically — every collaborator sees the same result, always.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-blue-200 text-base"
              >
                Start writing for free
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-border rounded-xl font-medium hover:bg-muted transition-colors text-base"
              >
                Sign in
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No credit card needed", "Works offline", "Open source"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check size={13} className="text-green-500" /> {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Everything you need</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Built for real teams who need their work to survive network outages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: WifiOff,
                title: "Works offline, always",
                desc: "All edits go to IndexedDB first. Zero network requests block the UI. Open, edit, close — the network is optional.",
                gradient: "from-amber-400 to-orange-500",
                bg: "bg-amber-50",
              },
              {
                icon: Zap,
                title: "Deterministic sync",
                desc: "Y.js CRDT (YATA algorithm) guarantees concurrent edits from multiple offline clients produce the same final state — no manual merging.",
                gradient: "from-blue-400 to-cyan-500",
                bg: "bg-blue-50",
              },
              {
                icon: History,
                title: "Version time-travel",
                desc: "Capture named snapshots at any point. Restore any version without disrupting other active collaborators.",
                gradient: "from-violet-500 to-purple-600",
                bg: "bg-violet-50",
              },
              {
                icon: Users,
                title: "Granular access control",
                desc: "Owner, Editor, and Viewer roles. Viewers are blocked at the WebSocket level from pushing any state updates.",
                gradient: "from-emerald-400 to-green-600",
                bg: "bg-emerald-50",
              },
              {
                icon: Shield,
                title: "Security-first",
                desc: "All sync payloads are validated with Zod. Payload size is capped at 5 MB at the transport layer to prevent OOM attacks.",
                gradient: "from-red-400 to-rose-600",
                bg: "bg-red-50",
              },
              {
                icon: Sparkles,
                title: "AI writing assistant",
                desc: "Groq-powered Llama 3.3 helps you continue writing, summarize, fix grammar, or rewrite in a different tone — inside the editor.",
                gradient: "from-pink-400 to-fuchsia-600",
                bg: "bg-pink-50",
              },
            ].map(({ icon: Icon, title, desc, gradient, bg }) => (
              <div
                key={title}
                className="group border border-border/60 rounded-2xl p-6 hover:border-transparent hover:shadow-xl hover:shadow-black/5 transition-all duration-300 bg-white"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${bg} bg-gradient-to-br ${gradient} bg-opacity-10`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient}`}>
                    <Icon size={18} className="text-white" />
                  </div>
                </div>
                <h3 className="font-semibold text-base mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 p-12 text-center text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTYgMHY2aDZ2LTZoLTZ6TTI0IDI0djZoNnYtNmgtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to collaborate?</h2>
              <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
                Join and start editing documents that work anywhere — online, offline, or somewhere in between.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg text-base"
              >
                Create free account <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
