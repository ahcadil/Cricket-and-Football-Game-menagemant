"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { updateTeamAction } from "@/server/actions/team";
import type { ActionState } from "@/lib/action";
import { formatM, formatMillion, formatMoney } from "@/lib/validators";
import { convertGoogleDriveUrl } from "@/lib/bulkPlayers";

interface Props {
  team: {
    id: string;
    name: string;
    sport: string;
    budget: number | bigint;
    spent: number | bigint;
    primaryColor?: string | null;
    tagline?: string | null;
    logoUrl?: string | null;
    owner?: {
      name?: string | null;
      email?: string | null;
    } | null;
  };
}

const PRESET_COLORS = [
  { label: "Emerald", hex: "#1aae72" },
  { label: "Blue", hex: "#3b82f6" },
  { label: "Crimson", hex: "#ef4444" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Purple", hex: "#8b5cf6" },
  { label: "Pink", hex: "#ec4899" },
  { label: "Cyan", hex: "#06b6d4" },
];

export function EditTeamButton({ team }: Props) {
  const [open, setOpen] = useState(false);
  const [budgetValue, setBudgetValue] = useState<number>(Number(team.budget));
  const [color, setColor] = useState<string>(team.primaryColor || "#1aae72");
  const [logoInput, setLogoInput] = useState<string>(team.logoUrl || "");
  const numSpent = Number(team.spent);

  const [state, formAction] = useActionState<ActionState, FormData>(
    (prev, fd) => updateTeamAction(prev, fd),
    null
  );

  useEffect(() => {
    setBudgetValue(Number(team.budget));
    setColor(team.primaryColor || "#1aae72");
    setLogoInput(team.logoUrl || "");
  }, [team, open]);

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => setOpen(false), 600);
      return () => clearTimeout(t);
    }
  }, [state]);

  const previewLogo = convertGoogleDriveUrl(logoInput) || logoInput;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-gold-500/20 text-gold-300 ring-1 ring-white/10 hover:ring-gold-400/50 text-xs font-normal transition active:scale-95"
      >
        ✏️ Edit Team
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-rise overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div className="card !p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <Avatar name={team.name} src={previewLogo} size={40} className="ring-2 ring-gold-400/50" />
                <div>
                  <h3 className="text-xl font-normal text-white">Edit Franchise ({team.name})</h3>
                  <p className="text-xs text-slate-400">Update budget, owner info, logo, sport, and colors.</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="id" value={team.id} />

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Team Name">
                  <Input name="name" defaultValue={team.name} required minLength={2} maxLength={60} />
                </Field>

                <Field label="Sport">
                  <Select name="sport" defaultValue={team.sport} required>
                    <option value="CRICKET">🏏 Cricket</option>
                    <option value="FOOTBALL">⚽ Football</option>
                  </Select>
                </Field>
              </div>

              {/* AUCTION BUDGET WITH MILLIONS & BILLIONS PRESETS */}
              <div className="space-y-1.5 bg-black/40 p-3 rounded-xl ring-1 ring-white/10">
                <Field
                  label="Auction Budget ($)"
                  hint={`= ${formatM(budgetValue)} (${formatMillion(budgetValue)}) ${
                    numSpent > 0 ? `· Spent: ${formatM(numSpent)}` : ""
                  }`}
                >
                  <Input
                    name="budget"
                    type="number"
                    min={numSpent}
                    step={100000}
                    value={budgetValue}
                    onChange={(e) => setBudgetValue(Number(e.target.value) || 0)}
                    required
                  />
                </Field>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] uppercase text-slate-400 font-normal">Quick Presets:</span>
                  {[
                    { label: "10M", val: 10_000_000 },
                    { label: "50M", val: 50_000_000 },
                    { label: "100M", val: 100_000_000 },
                    { label: "500M", val: 500_000_000 },
                    { label: "1B", val: 1_000_000_000 },
                    { label: "10B", val: 10_000_000_000 },
                  ]
                    .filter((amt) => amt.val >= numSpent)
                    .map((amt) => (
                      <button
                        key={amt.label}
                        type="button"
                        onClick={() => setBudgetValue(amt.val)}
                        className={`px-2 py-0.5 rounded text-[11px] font-normal transition ring-1 cursor-pointer ${
                          budgetValue === amt.val
                            ? "bg-gold-500/20 text-gold-300 ring-gold-400/50"
                            : "bg-black/30 text-slate-300 ring-white/10 hover:ring-white/30"
                        }`}
                      >
                        {amt.label}
                      </button>
                    ))}
                </div>
              </div>

              {/* PRIMARY COLOR & LOGO URL */}
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Brand Primary Color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      name="primaryColor"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-black border border-white/20 cursor-pointer shrink-0"
                    />
                    <Input
                      name="primaryColor"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#1aae72"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        className="w-5 h-5 rounded-full ring-1 ring-white/20 transition hover:scale-110"
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </Field>

                <Field label="Team Tagline / Slogan">
                  <Input name="tagline" defaultValue={team.tagline || ""} placeholder="e.g. Roar of Bengal" />
                </Field>
              </div>

              {/* LOGO PHOTO URL */}
              <Field label="Team Logo Photo URL" hint="Supports Google Drive links (drive.google.com/open?id=...)">
                <Input
                  name="logoUrl"
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  placeholder="https://drive.google.com/open?id=..."
                />
              </Field>

              {/* TEAM OWNER DETAILS */}
              <div className="space-y-3 bg-black/40 p-3 rounded-xl ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-wider text-gold-300 font-normal">Team Owner Info</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Owner Name">
                    <Input name="ownerName" defaultValue={team.owner?.name || ""} placeholder="Owner Name" />
                  </Field>
                  <Field label="Owner Email">
                    <Input name="ownerEmail" type="email" defaultValue={team.owner?.email || ""} placeholder="owner@example.com" />
                  </Field>
                </div>
              </div>

              {state?.error && (
                <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-3 py-2 text-sm text-red-300 font-normal">
                  ⚠️ {state.error}
                </div>
              )}
              {state?.ok && (
                <div className="rounded-lg bg-brand-500/10 ring-1 ring-brand-500/30 px-3 py-2 text-sm text-brand-300 font-normal">
                  ✅ Saved successfully.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost font-normal text-xs">Cancel</button>
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
    <button type="submit" disabled={pending} className="btn-primary font-normal text-xs py-2 px-4">
      {pending ? "Saving…" : "Save Team Changes"}
    </button>
  );
}
