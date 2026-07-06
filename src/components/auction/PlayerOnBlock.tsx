"use client";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, tierFromBasePrice } from "@/lib/validators";

interface Initial {
  id: string; name: string; sport: string; photoUrl: string | null;
  basePrice: number; role: string | null;
}
interface Sale {
  playerId: string; name: string; teamName: string; soldPrice: number; primaryColor: string;
}
interface Unsold { playerId: string; name: string }

export function PlayerOnBlock({ initial, initialRecent }: { initial: Initial | null; initialRecent: Sale[] }) {
  const [onBlock, setOnBlock] = useState<Initial | null>(initial);
  const [flash, setFlash] = useState<"SOLD" | "UNSOLD" | null>(null);
  const [recent, setRecent] = useState<Sale[]>(initialRecent);
  const [unsold, setUnsold] = useState<Unsold[]>([]);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/auction/stream");
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "ON_BLOCK") {
          setOnBlock({
            id: payload.playerId, name: payload.name, sport: payload.sport,
            photoUrl: payload.photoUrl, basePrice: payload.basePrice, role: payload.role,
          });
          setFlash(null);
        } else if (payload.type === "CLEAR") {
          setOnBlock(null);
        } else if (payload.type === "SOLD") {
          const sale: Sale = {
            playerId: payload.playerId, name: payload.name, teamName: payload.teamName,
            soldPrice: payload.soldPrice, primaryColor: payload.primaryColor,
          };
          setFlash("SOLD");
          setLastSale(sale);
          setRecent((prev) => [sale, ...prev].slice(0, 10));
          setTimeout(() => { setOnBlock(null); setFlash(null); setLastSale(null); }, 3000);
        } else if (payload.type === "UNSOLD") {
          setFlash("UNSOLD");
          setUnsold((p) => [{ playerId: payload.playerId, name: payload.name }, ...p].slice(0, 10));
          setTimeout(() => { setOnBlock(null); setFlash(null); }, 2000);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  return (
    <div className="grid lg:grid-cols-[2fr_1fr] gap-4 sm:gap-6">
      {/* MAIN STAGE */}
      <div
        className={`relative overflow-hidden rounded-3xl ring-1 transition
          ${flash === "SOLD" ? "ring-gold-400 sold-flash shadow-glow-gold" : flash === "UNSOLD" ? "ring-red-500 shadow-glow-red" : "ring-white/10"}
          bg-gradient-to-br from-pitch-light/60 via-pitch-dark to-pitch-dark`}
      >
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-gold-500/15 blur-3xl" />

        <div className="relative z-10 p-6 sm:p-10 text-center min-h-[420px] sm:min-h-[480px] flex flex-col items-center justify-center">
          {onBlock ? (
            <div className="animate-rise">
              <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-gold-400 mb-5 flex items-center justify-center gap-2">
                <span className="live-dot" /> Now on the block
              </p>

              <div className="relative inline-block animate-spotlight">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-400/40 to-brand-500/40 blur-xl scale-110" />
                <Avatar
                  name={onBlock.name}
                  src={onBlock.photoUrl}
                  size={120}
                  className="relative !w-[110px] !h-[110px] sm:!w-[140px] sm:!h-[140px] ring-4 ring-gold-400/40"
                />
              </div>

              <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl break-words heading-gradient">
                {onBlock.name}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-400">
                {onBlock.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"} · {onBlock.role ?? "—"}
              </p>

              <div className="mt-5 inline-flex items-center gap-3 sm:gap-4 rounded-full ring-1 ring-white/10 bg-black/40 px-4 sm:px-6 py-2 sm:py-3">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Tier</p>
                  <p className="text-xl sm:text-2xl font-display text-gold-400">{tierFromBasePrice(onBlock.basePrice)}</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Base Price</p>
                  <p className="text-xl sm:text-2xl font-display text-white">{formatMoney(onBlock.basePrice)}</p>
                </div>
              </div>

              {flash === "SOLD" && lastSale && (
                <div className="mt-7 animate-rise">
                  <p className="text-5xl sm:text-7xl font-display text-gold-400 drop-shadow-[0_0_30px_rgba(245,197,66,0.7)]">
                    SOLD!
                  </p>
                  <p className="mt-2 text-lg sm:text-xl">
                    to <span className="font-medium" style={{ color: lastSale.primaryColor }}>{lastSale.teamName}</span>
                  </p>
                  <p className="text-2xl sm:text-3xl font-display text-white mt-1">{formatMoney(lastSale.soldPrice)}</p>
                </div>
              )}
              {flash === "UNSOLD" && (
                <p className="mt-7 text-5xl sm:text-7xl font-display text-red-400 drop-shadow-[0_0_30px_rgba(248,113,113,0.6)] animate-rise">
                  UNSOLD
                </p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex w-20 h-20 rounded-full bg-white/5 ring-1 ring-white/10 items-center justify-center text-4xl animate-float">
                🔨
              </div>
              <p className="mt-6 text-xl sm:text-2xl shimmer-text">Awaiting next player…</p>
              <p className="mt-2 text-sm text-slate-500">The organizer will announce the next lot shortly.</p>
            </div>
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="space-y-4">
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <span>💰</span> Recent Sales
          </p>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">None yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((s, i) => (
                <li key={`${s.playerId}-${i}`} className="flex items-center justify-between text-sm gap-2 animate-rise">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{s.name}</p>
                    <p className="text-xs truncate" style={{ color: s.primaryColor }}>↳ {s.teamName}</p>
                  </div>
                  <span className="text-gold-400 font-display whitespace-nowrap">{formatMoney(s.soldPrice)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {unsold.length > 0 && (
          <div className="card ring-red-500/30">
            <p className="text-xs uppercase tracking-widest text-red-300 mb-2 flex items-center gap-2">
              <span>❌</span> Unsold
            </p>
            <ul className="text-sm text-slate-300 space-y-1">
              {unsold.map(u => <li key={u.playerId}>· {u.name}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
