"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Loader2, Eye, EyeOff, AlertCircle,
  WifiOff, Zap, Sparkles, ShieldCheck, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const FEATURES = [
  {
    icon: WifiOff,
    label: "Offline-first by design",
    desc: "All edits persist in IndexedDB — the network is optional, never blocking.",
  },
  {
    icon: Zap,
    label: "Conflict-free CRDT sync",
    desc: "Y.js YATA algorithm guarantees the same final state on every device.",
  },
  {
    icon: Sparkles,
    label: "AI writing assistant",
    desc: "Groq Llama 3.3 continues, summarises, and polishes your prose inline.",
  },
  {
    icon: ShieldCheck,
    label: "Role-based access control",
    desc: "Owner · Editor · Viewer roles enforced at the WebSocket layer.",
  },
];

export default function LoginPage() {
  const router  = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email: email.toLowerCase(), password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      toast.error("Invalid email or password");
    } else {
      toast.success("Signed in successfully");
      router.push("/documents");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
              <FileText size={15} className="text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              CollabDocs
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1">
              Sign up free <ArrowRight size={12} />
            </Link>
          </p>
        </div>
      </header>

      {/* Two-column body */}
      <main className="flex-1 flex">

        {/* Left brand panel — desktop only */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden flex-col justify-between bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 p-12 text-white">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />

          <div className="relative space-y-10">
            <div>
              <span className="inline-block bg-white/15 border border-white/20 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
                Local-First · CRDT Sync · Offline-Ready
              </span>
              <h2 className="text-4xl font-bold leading-snug mb-3">
                Your documents,<br />always in sync.
              </h2>
              <p className="text-blue-100/80 text-lg leading-relaxed max-w-sm">
                Collaborative editing that works even when the internet doesn&apos;t.
              </p>
            </div>

            <ul className="space-y-5">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{label}</p>
                    <p className="text-blue-200/70 text-xs mt-1 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Testimonial */}
          <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
            <div className="text-amber-400 text-base mb-3">★★★★★</div>
            <p className="text-sm text-white/90 italic leading-relaxed">
              &ldquo;The CRDT-based offline sync is genuinely impressive — no conflicts, no lost work, even after hours offline.&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                S
              </div>
              <div>
                <p className="text-sm font-semibold">Shivanand Vishwakarma</p>
                <p className="text-xs text-blue-200/60 mt-0.5">Full-Stack Developer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-10 py-12 bg-slate-50/50">
          <div className="w-full max-w-sm">

            {/* Mobile-only logo */}
            <div className="text-center mb-8 lg:hidden">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                <FileText size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your CollabDocs account</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
              <p className="text-muted-foreground mt-1.5">Enter your credentials to continue</p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-sm text-destructive bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-2 text-foreground">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 text-sm border border-border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold mb-2 text-foreground">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-11 text-sm border border-border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-2 py-3 mt-1 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200/60 text-sm"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Signing in…" : "Sign in to CollabDocs"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Create one free
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground/40 mt-8">
              Encrypted · Local-first · Open source
            </p>
          </div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-border/60 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between text-xs text-muted-foreground/50">
          <span>© {new Date().getFullYear()} CollabDocs · House of Edtech Assignment</span>
          <div className="flex items-center gap-4">
            <a href="https://github.com/Shiva7781" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="https://www.linkedin.com/in/shivanand-vishwakarma/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
