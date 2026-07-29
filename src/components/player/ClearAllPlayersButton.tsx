"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { clearAllPlayersAction } from "@/server/actions/adminPlayer";
import type { ActionState } from "@/lib/action";

export function ClearAllPlayersButton({ totalPlayers }: { totalPlayers: number }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction] = useActionState<ActionState, FormData>(
    (prev, fd) => clearAllPlayersAction(prev, fd),
    null
  );

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => {
        setOpen(false);
        setConfirmText("");
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const isConfirmValid = confirmText.trim().toUpperCase() === "DELETE";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={totalPlayers === 0}
        className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-300 ring-1 ring-red-400/30 text-xs font-normal transition active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
      >
        <span>🗑️ Clear All ({totalPlayers})</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-rise overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div className="card !p-6 max-w-md w-full ring-2 ring-red-500/50 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-normal">
                <span className="text-xl">⚠️</span>
                <h3 className="text-lg font-normal text-white">Clear All Players</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p className="text-red-300 bg-red-500/10 p-3 rounded-xl ring-1 ring-red-500/30 font-normal">
                ⚠️ WARNING: You are about to permanently delete <strong>all {totalPlayers} player profiles</strong> from the tournament database!
              </p>
              <p className="text-slate-400">
                This will remove all player registrations, auction logs, and stats. This action <strong>cannot be undone</strong>.
              </p>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-300 font-normal block mb-1">
                  Type <span className="text-red-400 font-mono">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="input font-mono text-center tracking-widest text-red-300 uppercase py-2"
                />
              </div>

              {state?.error && (
                <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/40 p-2.5 text-xs text-red-300 font-normal">
                  ⚠️ {state.error}
                </div>
              )}
              {state?.ok && (
                <div className="rounded-lg bg-brand-500/10 ring-1 ring-brand-500/40 p-2.5 text-xs text-brand-300 font-normal">
                  ✅ {(state as any)?.message || "Successfully deleted all players!"}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs font-normal">
                  Cancel
                </button>
                <SubmitButton disabled={!isConfirmValid} />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="btn-danger font-normal text-xs py-2 px-5 cursor-pointer disabled:opacity-40"
    >
      {pending ? "Deleting All..." : "🗑️ Delete All Players"}
    </button>
  );
}
