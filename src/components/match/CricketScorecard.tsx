// Presentational (server) scorecard for the currently batting innings.
// All figures come pre-derived from lib/cricket — this file only renders.
import { Badge } from "@/components/ui/Badge";
import type { InningsCard, BallInput } from "@/lib/cricket";
import { chargeFor } from "@/lib/cricket";

interface Props {
  card: InningsCard;
  nameOf: (id: string | null) => string;
  battingTeam: string;
  /** current striker/non-striker (client-tracked) so we can mark * on the card */
  strikerId?: string | null;
  nonStrikerId?: string | null;
}

function ballPill(b: BallInput) {
  const isBoundary = (b.extraType === null || b.extraType === "NOBALL") && (b.runs === 4 || b.runs === 6);
  const cls = b.isWicket
    ? "bg-red-500/30 text-red-300 ring-red-500/40"
    : b.extraType
      ? "bg-sky-500/20 text-sky-200 ring-sky-500/30"
      : isBoundary
        ? "bg-gold-500/25 text-gold-200 ring-gold-500/40"
        : "bg-white/5 text-slate-200 ring-white/10";
  const label = b.isWicket
    ? "W"
    : b.extraType
      ? (b.extraType[0].toLowerCase() + (b.runs || ""))
      : String(b.runs);
  return { cls, label };
}

export function CricketScorecard({ card, nameOf, battingTeam, strikerId, nonStrikerId }: Props) {
  const { batting, bowling, extras, fow, thisOver } = card;

  return (
    <div className="space-y-4">
      {/* THIS OVER */}
      <div className="card">
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">This Over</p>
        {thisOver.length === 0 ? (
          <p className="text-sm text-slate-500">New over — no balls yet.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {thisOver.map(b => {
              const { cls, label } = ballPill(b);
              return (
                <span key={b.id} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ring-1 ${cls}`}>
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* BATTING */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-sm font-medium">{battingTeam} — Batting</p>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">R (B) · 4s · 6s · SR</span>
        </div>
        {batting.length === 0 ? (
          <p className="text-sm text-slate-500 px-4 py-3">No batters yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {batting.map(b => {
              const onStrike = b.batsmanId === strikerId;
              const atCrease = onStrike || b.batsmanId === nonStrikerId;
              return (
                <li key={b.batsmanId} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="truncate flex items-center gap-1.5">
                      <span className={atCrease && !b.isOut ? "text-white" : "text-slate-300"}>
                        {nameOf(b.batsmanId)}
                      </span>
                      {onStrike && !b.isOut && <span className="text-gold-400" title="on strike">*</span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {b.isOut ? (b.dismissal ?? "out") : atCrease ? "not out" : "yet to bat"}
                    </p>
                  </div>
                  <span className="font-display text-base w-8 text-right">{b.runs}</span>
                  <span className="text-slate-500 w-8 text-right">({b.balls})</span>
                  <span className="text-slate-400 w-6 text-right hidden sm:inline">{b.fours}</span>
                  <span className="text-slate-400 w-6 text-right hidden sm:inline">{b.sixes}</span>
                  <span className="text-slate-400 w-12 text-right tabular-nums">{b.strikeRate.toFixed(1)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {/* extras + total footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 text-sm">
          <span className="text-slate-400">
            Extras <span className="text-slate-200">{extras.total}</span>
            <span className="text-xs text-slate-500 ml-1">
              (w {extras.wides}, nb {extras.noballs}, b {extras.byes}, lb {extras.legbyes})
            </span>
          </span>
          <span className="font-display">
            {card.totalRuns}/{card.wickets}
          </span>
        </div>
      </div>

      {/* BOWLING */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-sm font-medium">Bowling</p>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">O · M · R · W · Econ</span>
        </div>
        {bowling.length === 0 ? (
          <p className="text-sm text-slate-500 px-4 py-3">No bowlers yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {bowling.map(b => (
              <li key={b.bowlerId} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                <span className="flex-1 min-w-0 truncate text-slate-300">{nameOf(b.bowlerId)}</span>
                <span className="w-10 text-right text-slate-400">{b.overs}</span>
                <span className="w-8 text-right text-slate-400 hidden sm:inline">{b.maidens}</span>
                <span className="w-8 text-right text-slate-400">{b.runs}</span>
                <span className="w-8 text-right font-display text-gold-300">{b.wickets}</span>
                <span className="w-12 text-right text-slate-400 tabular-nums">{b.economy.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FALL OF WICKETS */}
      {fow.length > 0 && (
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Fall of Wickets</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {fow.map(w => (
              <Badge key={w.wicketNumber} tone="slate">
                {w.score}-{w.wicketNumber}
                <span className="text-slate-400 ml-1">
                  ({nameOf(w.batsmanId)}, {w.overs})
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
