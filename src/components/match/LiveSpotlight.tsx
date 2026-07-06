import Link from "next/link";
import { cricketLines, footballScore, type InningsSlim, type FootballSlim } from "@/lib/format";
import type { MatchTileData } from "./MatchTile";

export function LiveSpotlight({ m, isAdmin }: { m: MatchTileData; isAdmin?: boolean }) {
  return (
    <article
      className="relative overflow-hidden rounded-2xl ring-2 ring-red-500/50 animate-rise"
      style={{
        background: `linear-gradient(135deg, ${m.teamA.primaryColor}33 0%, rgba(239,68,68,0.08) 50%, ${m.teamB.primaryColor}33 100%)`,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1.5 flex">
        <div style={{ backgroundColor: m.teamA.primaryColor }} className="flex-1" />
        <div style={{ backgroundColor: m.teamB.primaryColor }} className="flex-1" />
      </div>
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-red-500/15 blur-3xl" />

      <div className="relative p-5 sm:p-7">
        <div className="flex items-center justify-between mb-4">
          <span className="chip ring-red-400/60 bg-red-500/20 text-red-300 animate-pulse">
            <span className="live-dot" /> LIVE NOW
          </span>
          <span className="text-xs text-slate-400">{m.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"}{m.venue && ` · ${m.venue}`}</span>
        </div>

        {m.sport === "CRICKET" ? <CricketBig m={m} /> : <FootballBig m={m} />}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/matches/${m.id}`} className="btn-gold flex-1 sm:flex-none">
            📺 Watch Live
          </Link>
          {isAdmin && (
            <Link href={`/admin/matches/${m.id}/score`} className="btn-primary flex-1 sm:flex-none">
              🎯 Score Now
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function CricketBig({ m }: { m: MatchTileData }) {
  const lines = cricketLines(m);
  if (lines.length === 0) {
    return (
      <p className="text-2xl sm:text-3xl text-center">
        <span style={{ color: m.teamA.primaryColor }}>{m.teamA.name}</span>
        <span className="text-slate-500 mx-3">vs</span>
        <span style={{ color: m.teamB.primaryColor }}>{m.teamB.name}</span>
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-lg sm:text-xl truncate flex-1">{l.teamName}{l.closed && <span className="text-xs text-slate-400 ml-2">(closed)</span>}</span>
          <span className="font-display text-3xl sm:text-4xl whitespace-nowrap">
            {l.runs}<span className="text-slate-500">/{l.wickets}</span>
            <span className="text-sm sm:text-base text-slate-400 ml-2">({l.overs})</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function FootballBig({ m }: { m: MatchTileData }) {
  const { a, b } = footballScore(m);
  return (
    <div className="grid grid-cols-3 items-center gap-3">
      <div className="text-right min-w-0">
        <p className="text-lg sm:text-2xl truncate" style={{ color: m.teamA.primaryColor }}>{m.teamA.name}</p>
        <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: m.teamA.primaryColor }} />
      </div>
      <p className="text-4xl sm:text-6xl font-display text-center whitespace-nowrap">
        <span className={a >= b ? "text-white" : "text-slate-500"}>{a}</span>
        <span className="text-slate-600 mx-2">–</span>
        <span className={b >= a ? "text-white" : "text-slate-500"}>{b}</span>
      </p>
      <div className="text-left min-w-0">
        <p className="text-lg sm:text-2xl truncate" style={{ color: m.teamB.primaryColor }}>{m.teamB.name}</p>
        <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: m.teamB.primaryColor }} />
      </div>
    </div>
  );
}
