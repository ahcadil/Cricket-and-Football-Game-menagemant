"use client";
import { useActionState, useState } from "react";
import { approveAllPendingPlayersAction } from "@/server/actions/adminPlayer";
import { formatM } from "@/lib/validators";
import type { ActionState } from "@/lib/action";

export function ApproveAllForm({ count }: { count: number }) {
  const [basePrice, setBasePrice] = useState(50_000_000);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    (prev, fd) => approveAllPendingPlayersAction(prev, fd),
    null
  );

  if (count === 0) return null;

  return (
    <div className="card p-4 ring-2 ring-gold-400/50 bg-gradient-to-r from-gold-500/10 via-black/40 to-brand-500/10 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-gold-300 flex items-center gap-2">
            ⚡ One-Click Bulk Approval
          </p>
          <p className="text-sm text-slate-300">
            Approve all <span className="text-white font-bold">{count}</span> pending player submissions at once.
          </p>
        </div>
        <span className="text-xs font-bold text-gold-400 bg-gold-500/20 px-2.5 py-1 rounded-full ring-1 ring-gold-400/30">
          Set Base Price: {formatM(basePrice)}
        </span>
      </div>

      <form action={formAction} className="space-y-3 pt-1">
        <input type="hidden" name="defaultBasePrice" value={basePrice} />

        {/* PRESET BUTTONS FOR BULK APPROVAL BASE PRICE */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Uniform Base Price:</span>
          {[
            { label: "50M", value: 50_000_000 },
            { label: "10M", value: 10_000_000 },
            { label: "20M", value: 20_000_000 },
            { label: "100M", value: 100_000_000 },
          ].map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setBasePrice(preset.value)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ring-1 cursor-pointer ${
                basePrice === preset.value
                  ? "bg-gold-500 text-pitch-dark ring-gold-300 shadow-md shadow-gold-500/20"
                  : "bg-black/50 text-gold-300 ring-white/10 hover:bg-gold-500/20 hover:ring-gold-400/50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="btn-gold font-bold text-sm py-2.5 px-5 flex-1 sm:flex-none cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {pending ? "Approving All..." : `⚡ One-Click Approve All (${count} Pending)`}
          </button>
        </div>

        {state?.error && (
          <p className="text-xs text-red-400 font-semibold mt-1">⚠️ {state.error}</p>
        )}
        {state?.ok && (
          <p className="text-xs text-brand-300 font-semibold mt-1">✅ {(state as any)?.message || "Successfully approved all pending players!"}</p>
        )}
      </form>
    </div>
  );
}
