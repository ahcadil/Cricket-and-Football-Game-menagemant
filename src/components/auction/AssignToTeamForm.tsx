"use client";
import { useState } from "react";
import { Select } from "@/components/ui/Select";
import { assignToTeamAction, markUnsoldAction, clearBlockAction } from "@/server/actions/auction";

interface Team {
  id: string; name: string; sport: string; remaining: number;
}

interface Props { playerId: string; basePrice: number; sport: string; teams: Team[] }

export function AssignToTeamForm({ playerId, basePrice, sport, teams }: Props) {
  const [price, setPrice] = useState(basePrice);

  // Any team can take any player — the only hard limit is budget.
  // Teams matching the player's sport are listed first (with the cross-sport
  // ones flagged for clarity), and over-budget teams are disabled with a reason.
  const decorated = teams
    .map(t => {
      const overBudget = t.remaining < price;
      const crossSport = t.sport !== sport;
      return { ...t, disabled: overBudget, crossSport, reason: overBudget ? "over budget" : null };
    })
    // Selectable first, then same-sport before cross-sport, then alphabetical.
    .sort((a, b) =>
      Number(a.disabled) - Number(b.disabled) ||
      Number(a.crossSport) - Number(b.crossSport) ||
      a.name.localeCompare(b.name)
    );

  const eligibleCount = decorated.filter(t => !t.disabled).length;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <form action={assignToTeamAction} className="card p-4 space-y-3">
        <p className="text-sm font-medium text-gold-400">Assign to Team</p>
        <input type="hidden" name="playerId" value={playerId} />
        <Select name="teamId" required defaultValue="">
          <option value="" disabled>
            {eligibleCount === 0 ? "— no eligible team —" : "— select team —"}
          </option>
          {decorated.map(t => (
            <option key={t.id} value={t.id} disabled={t.disabled}>
              {t.name} (₹{t.remaining.toLocaleString()} left)
              {t.crossSport ? ` · ${t.sport.toLowerCase()}` : ""}
              {t.reason ? ` — ${t.reason}` : ""}
            </option>
          ))}
        </Select>
        {eligibleCount === 0 && (
          <p className="text-xs text-red-400">
            No team has enough budget for ₹{price.toLocaleString()} — lower the price or free up budget.
          </p>
        )}
        <div>
          <label className="label">Sold Price (₹)</label>
          <input name="soldPrice" type="number" min={0} step={50000} value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="input" required />
        </div>
        <button className="btn-gold w-full">Hammer Down — SOLD</button>
      </form>

      <div className="space-y-3">
        <form action={markUnsoldAction} className="card p-4">
          <input type="hidden" name="playerId" value={playerId} />
          <p className="text-sm text-slate-300 mb-3">No takers? Send to the unsold pile.</p>
          <button className="btn-danger w-full">Mark UNSOLD</button>
        </form>
        <form action={clearBlockAction} className="card p-4">
          <p className="text-sm text-slate-300 mb-3">Pause — remove from block.</p>
          <button className="btn-ghost w-full">Clear Block</button>
        </form>
      </div>
    </div>
  );
}
