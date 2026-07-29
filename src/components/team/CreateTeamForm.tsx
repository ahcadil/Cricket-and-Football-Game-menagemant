"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createTeamAction } from "@/server/actions/team";
import type { ActionState } from "@/lib/action";
import { formatM, formatMillion } from "@/lib/validators";

interface OwnerOption { id: string; name: string; email: string }
interface Props { ownerCandidates: OwnerOption[] }

export function CreateTeamForm({ ownerCandidates }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    (prev, fd) => createTeamAction(prev, fd),
    null
  );
  const [ownerMode, setOwnerMode] = useState<"existing" | "new">(
    ownerCandidates.length > 0 ? "existing" : "new"
  );
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1aae72");
  const [sport, setSport] = useState<"CRICKET" | "FOOTBALL">("CRICKET");
  const [budgetValue, setBudgetValue] = useState<number>(50000000);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form once after a successful save (effect — not inline — to avoid infinite re-render)
  useEffect(() => {
    if (state?.ok && formRef.current) {
      formRef.current.reset();
      setName("");
      setColor("#1aae72");
      setSport("CRICKET");
      setBudgetValue(50000000);
      if (ownerCandidates.length > 0) setOwnerMode("existing");
    }
  }, [state, ownerCandidates.length]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {/* Live preview */}
      <div
        className="relative overflow-hidden rounded-2xl ring-1 ring-white/10 p-5"
        style={{ background: `linear-gradient(135deg, ${color}33 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 100%)` }}
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: color }} />
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Preview</p>
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-2xl ring-1 ring-white/10"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)`, color: "#04100c" }}
          >
            {(name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg truncate">{name || "Your team name"}</p>
            <p className="text-xs text-slate-400">
              {sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"} · <span className="text-gold-400 font-medium">Budget: {formatM(budgetValue)} ({formatMillion(budgetValue)})</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Team Name">
          <Input
            name="name"
            required
            minLength={2}
            maxLength={60}
            placeholder="Mumbai Mavericks"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Sport">
          <Select
            name="sport"
            required
            value={sport}
            onChange={(e) => setSport(e.target.value as "CRICKET" | "FOOTBALL")}
          >
            <option value="CRICKET">🏏 Cricket</option>
            <option value="FOOTBALL">⚽ Football</option>
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        <div className="grid md:grid-cols-3 gap-4">
          <Field
            label="Auction Budget ($)"
            hint={`= ${formatM(budgetValue)} (${formatMillion(budgetValue)})`}
          >
            <Input
              name="budget"
              type="number"
              min={0}
              step={100000}
              value={budgetValue}
              onChange={(e) => setBudgetValue(Number(e.target.value) || 0)}
              required
            />
          </Field>
          <Field label="Primary Color">
            <div className="flex gap-2">
              <input
                name="primaryColor"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-[42px] rounded-lg ring-1 ring-white/10 bg-black/30 cursor-pointer"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
            </div>
          </Field>
          <Field label="Logo URL" hint="Optional — paste image URL">
            <Input name="logoUrl" placeholder="https://…" />
          </Field>
        </div>
        
        {/* Million Preset Quick Buttons */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Quick Millions:</span>
          {[5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setBudgetValue(amt)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ring-1 ${
                budgetValue === amt
                  ? "bg-gold-500/20 text-gold-300 ring-gold-400/50"
                  : "bg-black/30 text-slate-300 ring-white/10 hover:ring-white/30"
              }`}
            >
              {formatM(amt)}
            </button>
          ))}
        </div>
      </div>

      <Field label="Tagline" hint="Optional, max 120 characters">
        <Input name="tagline" maxLength={120} placeholder="Born to roar." />
      </Field>

      {/* Owner section */}
      <fieldset className="rounded-2xl bg-black/20 ring-1 ring-white/10 p-4 sm:p-5 space-y-4">
        <legend className="px-2 text-xs uppercase tracking-widest text-gold-400">Team Owner</legend>

        <input type="hidden" name="ownerMode" value={ownerMode} />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOwnerMode("existing")}
            disabled={ownerCandidates.length === 0}
            className={`p-3 rounded-xl ring-1 text-left transition disabled:opacity-50 ${
              ownerMode === "existing"
                ? "bg-gradient-to-br from-brand-400 to-brand-600 text-pitch-dark ring-brand-300"
                : "bg-black/30 ring-white/10 text-slate-200 hover:ring-white/30"
            }`}
          >
            <div className="text-sm font-medium">👤 Existing User</div>
            <div className={`text-[11px] ${ownerMode === "existing" ? "text-pitch-dark/70" : "text-slate-500"}`}>
              {ownerCandidates.length} eligible
            </div>
          </button>
          <button
            type="button"
            onClick={() => setOwnerMode("new")}
            className={`p-3 rounded-xl ring-1 text-left transition ${
              ownerMode === "new"
                ? "bg-gradient-to-br from-brand-400 to-brand-600 text-pitch-dark ring-brand-300"
                : "bg-black/30 ring-white/10 text-slate-200 hover:ring-white/30"
            }`}
          >
            <div className="text-sm font-medium">✨ Create New Account</div>
            <div className={`text-[11px] ${ownerMode === "new" ? "text-pitch-dark/70" : "text-slate-500"}`}>
              Owner gets a fresh login
            </div>
          </button>
        </div>

        {ownerMode === "existing" ? (
          <Field label="Pick the owner">
            {ownerCandidates.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                No eligible users — switch to "Create New Account" or have someone register first.
              </p>
            ) : (
              <Select name="ownerUserId" required defaultValue="">
                <option value="" disabled>— select a user —</option>
                {ownerCandidates.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Owner Name">
                <Input name="ownerName" required={ownerMode === "new"} placeholder="Jane Doe" minLength={2} maxLength={80} />
              </Field>
              <Field label="Owner Email">
                <Input name="ownerEmail" type="email" required={ownerMode === "new"} placeholder="owner@email.com" />
              </Field>
            </div>
            <Field label="Initial Password" hint="At least 6 characters — share with the owner">
              <Input name="ownerPassword" type="password" required={ownerMode === "new"} minLength={6} placeholder="••••••••" />
            </Field>
          </div>
        )}
      </fieldset>

      {/* Server error */}
      {state?.error && (
        <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-4 py-3 text-sm text-red-300 flex items-start gap-2 animate-rise">
          <span>⚠️</span>
          <span>{state.error}</span>
        </div>
      )}
      {state?.ok && (
        <div className="rounded-lg bg-brand-500/10 ring-1 ring-brand-500/30 px-4 py-3 text-sm text-brand-300 flex items-center gap-2 animate-rise">
          <span>✅</span>
          <span>Team created! Add another or scroll down to see all teams.</span>
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
      {pending ? "Creating…" : "Create Team"}
    </button>
  );
}
