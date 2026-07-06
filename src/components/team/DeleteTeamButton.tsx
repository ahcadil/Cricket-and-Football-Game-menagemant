"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteTeamAction } from "@/server/actions/team";
import type { ActionState } from "@/lib/action";

interface Props {
  teamId: string;
  teamName: string;
  playerCount: number;
  matchCount: number;
}

export function DeleteTeamButton({ teamId, teamName, playerCount, matchCount }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    (prev, fd) => deleteTeamAction(prev, fd),
    null
  );
  if (state?.ok) {
    // closes naturally after revalidation removes the card
    return null;
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-red-400 hover:text-red-300 text-xs font-medium">
        Delete
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-rise" onClick={() => setOpen(false)}>
          <div className="card !p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl mb-2">Delete {teamName}?</h3>
            <p className="text-sm text-slate-300">
              {playerCount > 0 && <>This will release <strong>{playerCount} player{playerCount === 1 ? "" : "s"}</strong> back to the auction pool. </>}
              {matchCount > 0 && <span className="text-red-400">⚠️ The team is in {matchCount} match{matchCount === 1 ? "" : "es"} — those must be deleted first.</span>}
              {matchCount === 0 && <>Auction history for this team will also be deleted. This cannot be undone.</>}
            </p>
            {state?.error && (
              <div className="mt-3 rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-3 py-2 text-sm text-red-300">
                {state.error}
              </div>
            )}
            <form action={formAction} className="mt-5 flex gap-2 justify-end">
              <input type="hidden" name="id" value={teamId} />
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <SubmitButton disabled={matchCount > 0} />
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-danger">
      {pending ? "Deleting…" : "Delete team"}
    </button>
  );
}
