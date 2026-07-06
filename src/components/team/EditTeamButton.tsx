"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Field, Input } from "@/components/ui/Input";
import { updateTeamAction } from "@/server/actions/team";
import type { ActionState } from "@/lib/action";

interface Props {
  teamId: string;
  name: string;
  budget: number;
  spent: number;
}

export function EditTeamButton({ teamId, name, budget, spent }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    (prev, fd) => updateTeamAction(prev, fd),
    null
  );

  // Close modal on successful save
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => setOpen(false), 600);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-brand-400 hover:text-brand-300 text-xs font-medium"
      >
        Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-rise"
          onClick={() => setOpen(false)}
        >
          <div className="card !p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl">Edit {name}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="id" value={teamId} />

              <Field label="Team Name">
                <Input name="name" defaultValue={name} required minLength={2} maxLength={60} />
              </Field>

              <Field
                label="Auction Budget (₹)"
                hint={spent > 0
                  ? `Already spent ₹${spent.toLocaleString()} — budget must be at least that.`
                  : "Cap on what they can spend at auction"}
              >
                <Input
                  name="budget"
                  type="number"
                  min={spent}
                  step={100000}
                  defaultValue={budget}
                  required
                />
              </Field>

              {state?.error && (
                <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-3 py-2 text-sm text-red-300">
                  ⚠️ {state.error}
                </div>
              )}
              {state?.ok && (
                <div className="rounded-lg bg-brand-500/10 ring-1 ring-brand-500/30 px-3 py-2 text-sm text-brand-300">
                  ✅ Saved.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Saving…" : "Save Changes"}
    </button>
  );
}
