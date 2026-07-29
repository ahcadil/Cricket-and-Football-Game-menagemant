"use client";
import { useActionState, useState } from "react";
import { updatePlayerAdminAction } from "@/server/actions/adminPlayer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatM } from "@/lib/validators";
import type { ActionState } from "@/lib/action";
import type { PlayerProfile, User } from "@prisma/client";

type PlayerWithUser = PlayerProfile & {
  user: Pick<User, "name" | "email">;
};

export function EditPlayerModal({ player }: { player: PlayerWithUser }) {
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState<"CRICKET" | "FOOTBALL">(player.sport as any);
  const [basePrice, setBasePrice] = useState<number>(Number(player.basePrice) || 0);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, fd) => {
      const res = await updatePlayerAdminAction(prev, fd);
      if (res?.ok) {
        setTimeout(() => setOpen(false), 800);
      }
      return res;
    },
    null
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost text-xs font-semibold px-2.5 py-1 text-gold-300 hover:text-gold-200 ring-1 ring-gold-400/30 hover:ring-gold-400/70 cursor-pointer transition active:scale-95"
      >
        ✏️ Edit Info
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-rise overflow-y-auto">
          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 ring-2 ring-gold-400/40 my-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>✏️ Edit Player Profile</span>
                  <span className="text-xs font-mono text-slate-400">({player.user.name})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Admin full edit control — update any player parameter below.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold px-2 py-0.5 rounded hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <form action={formAction} className="space-y-5">
              <input type="hidden" name="id" value={player.id} />

              {/* ACCOUNT & BASIC INFO */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gold-400 font-bold mb-3">
                  1. Account & Basic Details
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Full Name</label>
                    <Input name="name" defaultValue={player.user.name} required />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Email Address</label>
                    <Input name="email" type="email" defaultValue={player.user.email} required />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Sport</label>
                    <Select
                      name="sport"
                      value={sport}
                      onChange={(e) => setSport(e.target.value as any)}
                    >
                      <option value="CRICKET">🏏 Cricket</option>
                      <option value="FOOTBALL">⚽ Football</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Status</label>
                    <Select name="status" defaultValue={player.status}>
                      <option value="DRAFT">Draft</option>
                      <option value="SUBMITTED">Submitted (Pending)</option>
                      <option value="APPROVED">Approved (Auction Ready)</option>
                      <option value="ON_AUCTION">On Auction Block</option>
                      <option value="SOLD">Sold</option>
                      <option value="REJECTED">Rejected</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* BASE PRICE & AUCTION TIER */}
              <div className="rounded-xl bg-black/40 p-4 ring-1 ring-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider text-gold-400 font-bold">
                    2. Starting Base Price
                  </h3>
                  <span className="text-xs font-bold text-gold-300 bg-gold-500/20 px-2 py-0.5 rounded ring-1 ring-gold-400/30">
                    {formatM(basePrice)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                    <input
                      name="basePrice"
                      type="number"
                      min={0}
                      step={1000000}
                      value={basePrice}
                      onChange={(e) => setBasePrice(Math.max(0, Number(e.target.value) || 0))}
                      className="input pl-7 font-bold text-brand-300"
                      required
                    />
                  </div>
                </div>
                {/* PRESET BASE PRICES */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400">Presets:</span>
                  {[
                    { label: "50M", val: 50_000_000 },
                    { label: "10M", val: 10_000_000 },
                    { label: "20M", val: 20_000_000 },
                    { label: "100M", val: 100_000_000 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setBasePrice(p.val)}
                      className="px-2.5 py-1 rounded bg-black/50 text-gold-300 ring-1 ring-gold-400/30 text-xs font-bold hover:bg-gold-500/20 transition cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SPORT PROFILE */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gold-400 font-bold mb-3">
                  3. {sport === "CRICKET" ? "Cricket Roles & Styles" : "Football Position & Specs"}
                </h3>
                {sport === "CRICKET" ? (
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-semibold mb-1 block">Cricket Role</label>
                      <Select name="cricketRole" defaultValue={player.cricketRole ?? "BATSMAN"}>
                        <option value="BATSMAN">Batsman</option>
                        <option value="BOWLER">Bowler</option>
                        <option value="ALL_ROUNDER">All Rounder</option>
                        <option value="WICKET_KEEPER">Wicket Keeper</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-semibold mb-1 block">Batting Style</label>
                      <Input name="battingStyle" defaultValue={player.battingStyle ?? ""} placeholder="Right hand / Left hand" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-semibold mb-1 block">Bowling Style</label>
                      <Input name="bowlingStyle" defaultValue={player.bowlingStyle ?? ""} placeholder="Right arm fast / Spin" />
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 font-semibold mb-1 block">Football Position</label>
                      <Select name="footballPosition" defaultValue={player.footballPosition ?? "FORWARD"}>
                        <option value="FORWARD">Forward</option>
                        <option value="MIDFIELDER">Midfielder</option>
                        <option value="DEFENDER">Defender</option>
                        <option value="GOALKEEPER">Goalkeeper</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-semibold mb-1 block">Preferred Foot</label>
                      <Input name="preferredFoot" defaultValue={player.preferredFoot ?? ""} placeholder="Right / Left / Both" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-semibold mb-1 block">Jersey Number (#)</label>
                      <Input name="jerseyNumber" type="number" min={1} max={99} defaultValue={player.jerseyNumber ?? ""} placeholder="e.g. 10" />
                    </div>
                  </div>
                )}
              </div>

              {/* CONTACT, LOCATION & PHYSICALS */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gold-400 font-bold mb-3">
                  4. Session, Location & Physical Attributes
                </h3>
                <div className="grid sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Session</label>
                    <Input name="session" defaultValue={player.session ?? "24-25"} placeholder="e.g. 24-25" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">City</label>
                    <Input name="city" defaultValue={player.city ?? ""} placeholder="City name" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Phone</label>
                    <Input name="phone" defaultValue={player.phone ?? ""} placeholder="Phone number" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Experience (Years)</label>
                    <Input name="experienceYears" type="number" min={0} defaultValue={player.experienceYears} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Height (cm)</label>
                    <Input name="heightCm" type="number" min={50} max={250} defaultValue={player.heightCm ?? ""} placeholder="cm" />
                  </div>
                </div>
              </div>

              {/* BIO & PHOTO URL */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Photo Image URL</label>
                  <Input name="photoUrl" defaultValue={player.photoUrl ?? ""} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Player Bio</label>
                  <textarea
                    name="bio"
                    rows={3}
                    defaultValue={player.bio ?? ""}
                    className="input w-full"
                    placeholder="Short player biography and achievements..."
                  />
                </div>
              </div>

              {/* FEEDBACK & SUBMIT */}
              {state?.error && (
                <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/40 p-3 text-xs text-red-300 font-semibold">
                  ⚠️ {state.error}
                </div>
              )}
              {state?.ok && (
                <div className="rounded-lg bg-brand-500/10 ring-1 ring-brand-500/40 p-3 text-xs text-brand-300 font-semibold">
                  ✅ {(state as any)?.message || "Successfully updated player details!"}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-gold font-bold text-xs py-2 px-6 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {pending ? "Saving Changes..." : "💾 Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
