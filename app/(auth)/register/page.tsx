"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2,
  Users, History, ArrowRight, Check,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { num: "01", label: "Create your account", desc: "Takes under 30 seconds — no credit card." },
  { num: "02", label: "Write or import a doc", desc: "Start from scratch or paste existing content." },
  { num: "03", label: "Invite your team", desc: "Share with Owner · Editor · Viewer roles." },
  { num: "04", label: "Collaborate in real-time", desc: "Y.js CRDTs keep everyone in sync, even offline." },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm]         = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res  = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? "Registration failed");
      toast.error(json.error ?? "Registration failed", { duration: 5000 });
      setLoading(false);
      return;
    }
    setSuccess(true);
    toast.success("Account created!", { description: "Signing you in…" });
    const signInRes = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    setLoading(false);
    if (signInRes?.ok) {
      router.push("/documents");
      router.refresh();
    } else {
      toast.error("Auto sign-in failed", { description: "Please log in manually.", duration: 6000 });
      router.push("/login");
    }
  }

  const pwLen      = form.password.length;
  const pwStrength = pwLen >= 8 ? "strong" : pwLen >= 6 ? "medium" : "weak";
  const pwColor    = pwStrength === "strong" ? "bg-green-500" : pwStrength === "medium" ? "bg-yellow-500" : "bg-red-500";
  const pwWidth    = pwStrength === "strong" ? "w-full" : pwStrength === "medium" ? "w-2/3" : "w-1/3";

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
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1">
              Sign in <ArrowRight size={12} />
            </Link>
          </p>
        </div>
      </header>

      {/* Two-column body */}
      <main className="flex-1 flex">

        {/* Left brand panel — desktop only */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden flex-col justify-between bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-12 text-white">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />

          <div className="relative space-y-10">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Users size={14} className="text-white/60" />
                <span className="text-white/60 text-xs font-medium">Start collaborating today</span>
              </div>
              <h2 className="text-4xl font-bold leading-snug mb-3">
                Ship docs faster,<br />together.
              </h2>
              <p className="text-indigo-100/80 text-lg leading-relaxed max-w-sm">
                A local-first editor with real-time collaboration, version history, and AI assistance.
              </p>
            </div>

            {/* Steps */}
            <ol className="space-y-5">
              {STEPS.map(({ num, label, desc }) => (
                <li key={num} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-white/80">{num}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{label}</p>
                    <p className="text-indigo-200/70 text-xs mt-1 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Stats strip */}
          <div className="relative grid grid-cols-3 gap-4">
            {[
              { value: "Y.js", label: "CRDT engine" },
              { value: "3", label: "AI models" },
              { value: "∞", label: "Offline edits" },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/10 border border-white/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold leading-none mb-1">{value}</p>
                <p className="text-xs text-indigo-200/60">{label}</p>
              </div>
            ))}
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
              <h1 className="text-2xl font-bold">Create account</h1>
              <p className="text-muted-foreground text-sm mt-1">Start collaborating in seconds</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
              <p className="text-muted-foreground mt-1.5">Free forever · No credit card needed</p>
            </div>

            {success && (
              <div className="flex items-center gap-2.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
                <CheckCircle2 size={15} className="flex-shrink-0" />
                Account created! Signing you in…
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2.5 text-sm text-destructive bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold mb-2">Full name</label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={update("name")}
                  placeholder="Jane Smith"
                  required
                  minLength={2}
                  autoComplete="name"
                  className="w-full px-4 py-3 text-sm border border-border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-2">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 text-sm border border-border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold mb-2">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={update("password")}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-11 text-sm border border-border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all placeholder:text-muted-foreground/50"
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
                {form.password && (
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pwColor} ${pwWidth}`} />
                    </div>
                    <span className="text-xs text-muted-foreground capitalize font-medium w-12 text-right">{pwStrength}</span>
                  </div>
                )}
              </div>

              {/* Perks list */}
              <ul className="space-y-1.5 pt-1">
                {["Free forever — no credit card", "Works offline instantly", "Invite teammates from day one"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check size={12} className="text-green-500 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200/60 text-sm"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Creating account…" : "Create free account"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Sign in
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
