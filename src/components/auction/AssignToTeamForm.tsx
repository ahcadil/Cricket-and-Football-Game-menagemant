"use client";
import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { assignToTeamAction, markUnsoldAction, clearBlockAction } from "@/server/actions/auction";
import { formatM, formatMillion, formatMoney } from "@/lib/validators";
import { SQUAD_SIZE, MIN_PLAYER_PRICE } from "@/lib/auction";

interface Team {
  id: string; name: string; sport: string;
  remaining: number; squadCount: number; slotsLeft: number;
  full: boolean; perPlayer: number; maxBid: number;
}

interface SoldHistoryItem {
  id: string;
  name: string;
  photoUrl?: string | null;
  soldPrice: number;
  teamName: string;
  teamColor?: string | null;
  soldAt: string;
}

interface Props {
  playerId: string;
  basePrice: number;
  sport: string;
  teams: Team[];
  soldHistory?: SoldHistoryItem[];
}

interface LiveBidLog {
  teamId: string;
  teamName: string;
  primaryColor?: string;
  amount: number;
  ownerName?: string;
  time: string;
}

export function AssignToTeamForm({ playerId, basePrice, sport, teams, soldHistory = [] }: Props) {
  const [price, setPrice] = useState(basePrice);
  const [teamId, setTeamId] = useState("");
  const [lastOwnerBid, setLastOwnerBid] = useState<{ teamName: string; amount: number; primaryColor?: string; ownerName?: string } | null>(null);
  const [bids, setBids] = useState<LiveBidLog[]>([]);

  useEffect(() => {
    setPrice(basePrice);
  }, [basePrice, playerId]);

  useEffect(() => {
    const es = new EventSource("/api/auction/stream");
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "ON_BLOCK") {
          if (payload.basePrice) setPrice(payload.basePrice);
          setLastOwnerBid(null);
          setBids([]);
        } else if (payload.type === "BID_PLACED") {
          if (payload.teamId) setTeamId(payload.teamId);
          if (payload.bidAmount) setPrice(payload.bidAmount);
          setLastOwnerBid({
            teamName: payload.teamName,
            amount: payload.bidAmount,
            primaryColor: payload.primaryColor,
            ownerName: payload.ownerName,
          });
          setBids((prev) => [
            {
              teamId: payload.teamId,
              teamName: payload.teamName,
              primaryColor: payload.primaryColor,
              amount: payload.bidAmount,
              ownerName: payload.ownerName,
              time: new Date().toLocaleTimeString(),
            },
            ...prev,
          ]);
        } else if (payload.type === "CLEAR" || payload.type === "SOLD" || payload.type === "UNSOLD") {
          setLastOwnerBid(null);
          setBids([]);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  // A team can take this player only if: squad not full, budget covers the
  // price, AND the price doesn't blow the reserve needed to fill the squad.
  const decorated = teams
    .map(t => {
      const crossSport = t.sport !== sport;
      const reason = t.full
        ? "squad full"
        : t.remaining < price
          ? "over budget"
          : price > t.maxBid
            ? `max ${formatM(t.maxBid)}`
            : null;
      return { ...t, disabled: reason !== null, crossSport, reason };
    })
    .sort((a, b) =>
      Number(a.disabled) - Number(b.disabled) ||
      Number(a.crossSport) - Number(b.crossSport) ||
      a.name.localeCompare(b.name)
    );

  const eligibleCount = decorated.filter(t => !t.disabled).length;
  const selected = teams.find(t => t.id === teamId) ?? null;
  const afterRemaining = selected ? selected.remaining - price : 0;
  const afterSlots = selected ? selected.slotsLeft - 1 : 0;
  const afterPerPlayer = afterSlots > 0 ? Math.floor(afterRemaining / afterSlots) : 0;

  const priceInM = price / 1_000_000;

  return (
    <div className="space-y-4">
      {/* REALTIME OWNER BID NOTIFICATION BANNER */}
      {lastOwnerBid && (
        <div className="rounded-xl bg-gradient-to-r from-gold-500/20 via-black/50 to-gold-500/20 ring-1 ring-gold-400/50 p-2.5 animate-rise shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/40 animate-ping"
              style={{ backgroundColor: lastOwnerBid.primaryColor || "#f5c542" }}
            />
            <p className="text-xs font-normal text-white">
              Live Bid: <span style={{ color: lastOwnerBid.primaryColor || "#f5c542" }}>{lastOwnerBid.teamName}</span>
              {lastOwnerBid.ownerName && <span className="text-[10px] text-slate-400 font-normal ml-1">({lastOwnerBid.ownerName})</span>}
            </p>
          </div>
          <span className="text-lg font-normal font-display text-gold-300">{formatM(lastOwnerBid.amount)}</span>
        </div>
      )}

      {/* PROMINENT BIDDING PRICE SPOTLIGHT DISPLAY (CLEAN NORMAL WEIGHT) */}
      <div className="rounded-2xl bg-gradient-to-r from-gold-500/20 via-black/80 to-gold-500/20 ring-1 ring-gold-400/50 p-3 text-center space-y-0.5 shadow-md animate-rise">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] font-normal text-gold-400 flex items-center justify-center gap-1.5">
          <span className="animate-ping w-2 h-2 rounded-full bg-gold-400" />
          <span>CURRENT BIDDING / WINNING PRICE</span>
        </p>
        <p className="text-3xl sm:text-4xl font-normal font-display text-gold-300">
          {formatM(price)}
        </p>
        <p className="text-xs font-normal text-slate-300 font-mono">
          {formatMillion(price)} ({formatMoney(price)})
        </p>
      </div>

      {/* 2-COLUMN GRID CONTAINER */}
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* LEFT COLUMN: WINNING FRANCHISE & BID PRICE CONTROLS */}
        <form action={assignToTeamAction} className="space-y-3 bg-black/50 p-4 rounded-2xl ring-1 ring-white/10">
          <input type="hidden" name="playerId" value={playerId} />
          <input type="hidden" name="soldPrice" value={price} />

          {/* 1. SELECT WINNING FRANCHISE */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-300 font-normal mb-1 block">
              1. Select Winning Franchise
            </label>
            <Select
              name="teamId"
              required
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={eligibleCount === 0}
              className="!bg-slate-950 text-white font-normal ring-1 ring-gold-400/40 hover:ring-gold-300 py-2 text-sm"
            >
              <option value="" disabled className="bg-slate-950 text-slate-400">
                {eligibleCount === 0 ? "— no eligible team —" : "— select winning team —"}
              </option>
              {decorated.map(t => (
                <option
                  key={t.id}
                  value={t.id}
                  disabled={t.disabled}
                  className={t.disabled ? "bg-slate-950 text-slate-500 py-1" : "bg-slate-950 text-slate-100 font-normal py-1"}
                >
                  {t.name} · {formatM(t.remaining)} · {t.squadCount}/{SQUAD_SIZE}
                  {t.crossSport ? ` · ${t.sport.toLowerCase()}` : ""}
                  {t.reason ? ` — ${t.reason}` : ""}
                </option>
              ))}
            </Select>
          </div>

          {/* 2. PRICE IN MILLIONS (M) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase tracking-wider text-slate-300 font-normal">
                2. Price in Millions (M)
              </label>
              <span className="text-[11px] font-normal text-gold-300 bg-gold-500/20 ring-1 ring-gold-400/30 px-1.5 py-0.5 rounded">
                = {formatM(price)} ({formatMillion(price)})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-normal text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={priceInM}
                  onChange={(e) => {
                    const valInM = Math.max(0, Number(e.target.value) || 0);
                    setPrice(Math.round(valInM * 1_000_000));
                  }}
                  className="input pl-6 pr-8 text-base font-normal text-gold-300 !py-1.5"
                  placeholder="e.g. 50"
                  required
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-normal text-gold-400">M</span>
              </div>
              {price !== basePrice && (
                <button
                  type="button"
                  onClick={() => setPrice(basePrice)}
                  className="btn-ghost text-[11px] text-slate-400 hover:text-white px-2 py-1.5 h-auto whitespace-nowrap font-normal"
                  title="Reset to base price"
                >
                  ↺ Reset
                </button>
              )}
            </div>
          </div>

          {/* Live "after this buy" strip */}
          {selected && (
            <div className="rounded-lg ring-1 ring-white/10 bg-black/60 px-3 py-1.5 text-xs">
              {afterRemaining < 0 || price > selected.maxBid ? (
                <p className="text-red-400 text-[11px]">
                  ⚠️ {price > selected.maxBid
                    ? `Exceeds max bid — must keep ${formatM(MIN_PLAYER_PRICE)}/slot for ${afterSlots} more. Max: ${formatM(selected.maxBid)}`
                    : "Not enough budget."}
                </p>
              ) : (
                <p className="text-slate-300 text-[11px]">
                  After buy: <span className="text-brand-300 font-normal">{formatM(afterRemaining)}</span> left ·{" "}
                  <span className="text-white">{selected.squadCount + 1}/{SQUAD_SIZE}</span> squad ·{" "}
                  {afterSlots > 0
                    ? <>~<span className="text-gold-400">{formatM(afterPerPlayer)}</span> per remaining slot</>
                    : <span className="text-brand-300">squad complete ✓</span>}
                </p>
              )}
            </div>
          )}

          {eligibleCount === 0 && (
            <p className="text-xs text-red-400">
              No team can take this player at {formatM(price)} — lower the price, or a team has a full squad / no reserve.
            </p>
          )}

          {/* 1-CLICK QUICK BID INCREMENT BUTTONS (MILLIONS & BILLIONS - NORMAL WEIGHT) */}
          <div className="space-y-1.5 pt-0.5 border-t border-white/5">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-normal text-slate-400 shrink-0">⚡ Quick Add (Millions):</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { label: "+10M", val: 10_000_000 },
                  { label: "+20M", val: 20_000_000 },
                  { label: "+30M", val: 30_000_000 },
                  { label: "+50M", val: 50_000_000 },
                  { label: "+100M", val: 100_000_000 },
                ].map((inc) => (
                  <button
                    key={inc.label}
                    type="button"
                    onClick={() => setPrice((p) => p + inc.val)}
                    className="px-2 py-1 rounded bg-gold-500/20 hover:bg-gold-500/35 text-gold-300 ring-1 ring-gold-400/30 text-xs font-normal transition active:scale-95 cursor-pointer"
                  >
                    {inc.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPrice((p) => Math.max(0, p - 10_000_000))}
                  className="px-1.5 py-1 rounded bg-red-500/10 hover:bg-red-500/25 text-red-300 ring-1 ring-red-400/20 text-[11px] font-normal transition cursor-pointer"
                >
                  -10M
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-normal text-amber-400 shrink-0">💎 Quick Add (Billions):</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { label: "+1B", val: 1_000_000_000 },
                  { label: "+2B", val: 2_000_000_000 },
                  { label: "+3B", val: 3_000_000_000 },
                  { label: "+5B", val: 5_000_000_000 },
                  { label: "+10B", val: 10_000_000_000 },
                ].map((inc) => (
                  <button
                    key={inc.label}
                    type="button"
                    onClick={() => setPrice((p) => p + inc.val)}
                    className="px-2 py-1 rounded bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 ring-1 ring-amber-400/40 text-xs font-normal transition active:scale-95 cursor-pointer"
                  >
                    {inc.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPrice((p) => Math.max(0, p - 1_000_000_000))}
                  className="px-1.5 py-1 rounded bg-red-500/10 hover:bg-red-500/25 text-red-300 ring-1 ring-red-400/20 text-[11px] font-normal transition cursor-pointer"
                >
                  -1B
                </button>
              </div>
            </div>
          </div>

          {/* COMPACT ACTION BUTTONS ROW (FORM-ACTION OVERRIDES - NO NESTED FORMS) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button type="submit" className="btn-gold font-medium text-sm py-2.5 w-full">
              🔨 Hammer Down ({formatM(price)})
            </button>

            <button type="submit" formAction={markUnsoldAction} className="btn-danger font-medium text-xs py-2.5 w-full cursor-pointer">
              ❌ Mark UNSOLD
            </button>

            <button type="submit" formAction={clearBlockAction} className="btn-ghost font-normal text-xs py-2.5 w-full cursor-pointer">
              ⏸️ Clear Block
            </button>
          </div>
        </form>

        {/* RIGHT COLUMN: PLAYER SOLD & AUCTION TRANSACTION HISTORY */}
        <div className="space-y-3 bg-black/50 p-4 rounded-2xl ring-1 ring-white/10 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <h4 className="text-xs uppercase tracking-wider font-normal text-gold-300 flex items-center gap-1.5">
                <span>📜 Players Sold History</span>
                <span className="chip ring-gold-400/30 bg-gold-500/10 text-gold-300 text-[10px] font-mono">
                  {soldHistory.length} Sold
                </span>
              </h4>
            </div>

            {soldHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center">
                No players sold yet in this auction session.
              </p>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {soldHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-black/40 ring-1 ring-white/10 flex items-center justify-between gap-3 hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={item.name} src={item.photoUrl} size={36} className="shrink-0 ring-1 ring-white/20" />
                      <div className="min-w-0">
                        <p className="text-xs font-normal text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.teamColor || "#1aae72" }} />
                          <span>{item.teamName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-normal font-display text-gold-300">
                        {formatM(item.soldPrice)}
                      </p>
                      <p className="text-[9px] text-slate-500">{item.soldAt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
