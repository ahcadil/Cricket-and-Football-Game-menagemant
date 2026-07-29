"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Field, Input } from "@/components/ui/Input";
import { bulkUpdateBudgetAction } from "@/server/actions/team";
import type { ActionState } from "@/lib/action";
import { formatM, formatMillion, formatMoney } from "@/lib/validators";

interface Props {
  teamCount: number;
}

const PRESETS = [
  { label: "100M", value: 100_000_000 },
  { label: "250M", value: 250_000_000 },
  { label: "500M", value: 500_000_000 },
  { label: "1B", value: 1_000_000_000 },
  { label: "2.5B", value: 2_500_000_000 },
  { label: "5B", value: 5_000_000_000 },
  { label: "10B", value: 10_000_000_000 },
];

export function BulkBudgetForm({ teamCount }: Props) {
  const [budgetValue, setBudgetValue] = useState<number>(100_000_000);
  const [state, formAction] = useActionState<ActionState, FormData>(
    (prev, fd) => bulkUpdateBudgetAction(prev, fd),
    null
  );

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gold-500/10 via-black/40 to-brand-500/10 ring-1 ring-gold-400/30 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <div>
            <h3 className="text-base font-semibold text-gold-300">One-Click Uniform Team Budget</h3>
            <p className="text-xs text-slate-400">
              Apply identical budget cap ({formatM(budgetValue)}) across all {teamCount} franchise{teamCount === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold bg-gold-500/20 text-gold-300 px-3 py-1 rounded-full ring-1 ring-gold-400/40">
          {formatM(budgetValue)} ({formatMillion(budgetValue)})
        </span>
      </div>

      <form action={formAction} className="space-y-4">
        {/* Preset Buttons 100M to 10B */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-2 font-medium">Quick Select (100M — 10B):</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setBudgetValue(p.value)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ring-1 ${
                  budgetValue === p.value
                    ? "bg-gold-500 text-pitch-dark ring-gold-300 shadow-lg shadow-gold-500/20 scale-[1.02]"
                    : "bg-black/40 text-slate-200 ring-white/10 hover:bg-white/10 hover:ring-white/25"
                }`}
              >
                <span className="text-sm">{p.label}</span>
                <span className={`text-[10px] ${budgetValue === p.value ? "text-pitch-dark/80" : "text-slate-400"}`}>
                  {p.value >= 1_000_000_000 ? `$${p.value / 1_000_000_000} Billion` : `$${p.value / 1_000_000} Million`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input & Action Button */}
        <div className="flex flex-col sm:flex-row items-end gap-3 pt-1">
          <div className="flex-1 w-full">
            <Field label="Custom Budget Amount ($)" hint={`Exact: ${formatMoney(budgetValue)}`}>
              <Input
                name="budget"
                type="number"
                min={0}
                step={1000000}
                value={budgetValue}
                onChange={(e) => setBudgetValue(Number(e.target.value) || 0)}
                required
              />
            </Field>
          </div>
          <SubmitButton teamCount={teamCount} formattedBudget={formatM(budgetValue)} />
        </div>

        {state?.error && (
          <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-3 py-2 text-sm text-red-300 animate-rise">
            ⚠️ {state.error}
          </div>
        )}
        {state?.ok && (
          <div className="rounded-lg bg-brand-500/10 ring-1 ring-brand-500/30 px-3 py-2 text-sm text-brand-300 animate-rise">
            ✅ {(state as any)?.message || "All teams budget updated!"}
          </div>
        )}
      </form>
    </div>
  );
}

function SubmitButton({ teamCount, formattedBudget }: { teamCount: number; formattedBudget: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || teamCount === 0}
      className="btn-primary w-full sm:w-auto bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-pitch-dark font-bold border-none whitespace-nowrap shadow-lg shadow-gold-500/20 disabled:opacity-50"
    >
      {pending ? "Applying…" : `⚡ Set ${formattedBudget} for All ${teamCount} Teams`}
    </button>
  );
}
