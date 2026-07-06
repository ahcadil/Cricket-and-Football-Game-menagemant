"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", { method: "POST", body: form });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) { setError(j.error ?? "Login failed"); return; }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="relative max-w-md mx-auto mt-6 sm:mt-12">
      <div className="absolute -inset-4 bg-gradient-to-br from-brand-500/20 to-gold-500/15 rounded-3xl blur-2xl" />
      <div className="relative card !p-8 animate-rise">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-brand-300 to-brand-500 items-center justify-center font-display text-2xl text-pitch-dark">
            👋
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl heading-gradient">Welcome back</h1>
            <p className="text-xs text-slate-400">Sign in to manage your tournament.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email"><Input type="email" name="email" required autoComplete="email" placeholder="you@example.com" /></Field>
          <Field label="Password"><Input type="password" name="password" required autoComplete="current-password" placeholder="••••••••" /></Field>
          {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg ring-1 ring-red-500/30">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign In →"}</Button>
        </form>
        <p className="mt-6 text-sm text-slate-400 text-center">
          New here? <Link href="/register" className="text-brand-400 hover:underline font-medium">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
