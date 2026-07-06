"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type RoleChoice = "PLAYER" | "TEAM_OWNER" | "VIEWER";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<RoleChoice>("PLAYER");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", { method: "POST", body: form });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) { setError(j.error ?? "Registration failed"); return; }
    if (j.role === "PLAYER") router.push("/profile");
    else if (j.role === "TEAM_OWNER") router.push("/my-team");
    else router.push("/");
    router.refresh();
  }

  const roleOptions: { value: RoleChoice; icon: string; title: string; desc: string }[] = [
    { value: "PLAYER", icon: "🏃", title: "Player", desc: "Register & get drafted" },
    { value: "TEAM_OWNER", icon: "🛡️", title: "Owner", desc: "Build your squad" },
    { value: "VIEWER", icon: "📺", title: "Fan", desc: "Follow the action" },
  ];

  return (
    <div className="relative max-w-md mx-auto mt-6 sm:mt-12">
      <div className="absolute -inset-4 bg-gradient-to-br from-gold-500/20 to-brand-500/15 rounded-3xl blur-2xl" />
      <div className="relative card !p-8 animate-rise">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 items-center justify-center font-display text-2xl text-pitch-dark">
            🎟️
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl heading-fire">Join ArenaCast</h1>
            <p className="text-xs text-slate-400">Create your account in seconds.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Full Name"><Input name="name" required minLength={2} placeholder="Your name" /></Field>
          <Field label="Email"><Input type="email" name="email" required placeholder="you@example.com" /></Field>
          <Field label="Password" hint="At least 6 characters">
            <Input type="password" name="password" required minLength={6} placeholder="••••••••" />
          </Field>

          <div>
            <label className="label">I am a…</label>
            <input type="hidden" name="role" value={role} />
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map(o => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => setRole(o.value)}
                  className={`p-3 rounded-xl ring-1 text-center transition active:scale-95 ${
                    role === o.value
                      ? "bg-gradient-to-br from-brand-400 to-brand-600 text-pitch-dark ring-brand-300 shadow-glow-brand"
                      : "bg-black/30 ring-white/10 text-slate-200 hover:ring-white/30"
                  }`}
                >
                  <div className="text-2xl">{o.icon}</div>
                  <div className="mt-1 text-xs font-medium">{o.title}</div>
                  <div className={`text-[10px] ${role === o.value ? "text-pitch-dark/70" : "text-slate-500"}`}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg ring-1 ring-red-500/30">{error}</p>}
          <Button type="submit" variant="gold" disabled={busy} className="w-full">
            {busy ? "Creating…" : "Create Account →"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-slate-400 text-center">
          Already have an account? <Link href="/login" className="text-brand-400 hover:underline font-medium">Sign in</Link>
        </p>
        <p className="mt-3 text-[11px] text-slate-500 text-center">
          Admin accounts are seeded — contact the organizer for access.
        </p>
      </div>
    </div>
  );
}
