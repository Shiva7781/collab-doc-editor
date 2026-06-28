"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    if (!json.success) {
      setError(json.error ?? "Registration failed");
      toast.error(json.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    setSuccess(true);
    toast.success("Account created! Signing you in…");
    // Auto sign-in after registration
    const signInRes = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);
    if (signInRes?.ok) {
      router.push("/documents");
      router.refresh();
    } else {
      toast.error("Auto sign-in failed. Please log in manually.");
      router.push("/login");
    }
  }

  const pwStrength = form.password.length >= 8 ? "strong" : form.password.length >= 6 ? "medium" : "weak";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-purple-500/5 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText size={22} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-muted-foreground text-sm mt-1">Start collaborating in seconds</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} />
              Account created! Signing you in…
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">Full name</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={update("name")}
              placeholder="Jane Smith"
              required
              minLength={2}
              autoComplete="name"
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
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
                className="w-full px-3 py-2.5 pr-10 text-sm border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.password && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pwStrength === "strong" ? "w-full bg-green-500" : pwStrength === "medium" ? "w-2/3 bg-yellow-500" : "w-1/3 bg-red-500"}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground capitalize">{pwStrength}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
