import Link from "next/link";
import { cricketLines, footballScore, formatRelative, type InningsSlim, type FootballSlim } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

interface TeamSlim { id: string; name: string; primaryColor: string }
export interface MatchTileData {
  id: string;
  sport: string;
  status: string;
  scheduledAt: Date;
  venue: string | null;
  teamAId: string;
  teamBId: string;
  teamA: TeamSlim;
  teamB: TeamSlim;
  winner?: { name: string } | null;
  motm?: { user: { name: string } } | null;
  innings: InningsSlim[];
  footballEvents: FootballSlim[];
}

export function MatchTile({ m, highlight, isAdmin }: { m: MatchTileData; highlight?: boolean; isAdmin?: boolean }) {
  const isLive = m.status === "LIVE";
  const isDone = m.status === "FINISHED";
  const isUpcoming = m.status === "UPCOMING";

  return (
    <article
      className={`relative overflow-hidden rounded-2xl ring-1 transition group h-full
        ${highlight ? "ring-gold-400/60" : "ring-white/10 hover:ring-white/30"}
        hover:-translate-y-0.5`}
      style={{
        background: `linear-gradient(135deg, ${m.teamA.primaryColor}1f 0%, transparent 50%, ${m.teamB.primaryColor}1f 100%)`,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1 flex">
        <div style={{ backgroundColor: m.teamA.primaryColor }} className="flex-1" />
        <div style={{ backgroundColor: m.teamB.primaryColor }} className="flex-1" />
      </div>

      <div className="p-5 space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between gap-2">
          {isLive ? (
            <span className="chip ring-red-400/60 bg-red-500/20 text-red-300">
              <span className="live-dot" /> LIVE
            </span>
          ) : isDone ? (
            <Badge tone="slate">Final</Badge>
          ) : (
            <Badge tone="brand">{formatRelative(m.scheduledAt)}</Badge>
          )}
          <span className="text-xs text-slate-400">{m.sport === "CRICKET" ? "🏏" : "⚽"} {m.sport}</span>
        </div>

        {/* Teams + score */}
        {m.sport === "CRICKET" ? (
          <CricketScore m={m} />
        ) : (
          <FootballScore m={m} />
        )}

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
          <span className="truncate">{new Date(m.scheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
          {m.venue && <span className="truncate ml-2 max-w-[120px]">📍 {m.venue}</span>}
        </div>
        {m.winner && (
          <p className="text-xs text-gold-400">
            🏆 {m.winner.name} won{m.motm && <> · MOTM {m.motm.user.name}</>}
          </p>
        )}

        {/* Action row */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/matches/${m.id}`} className="btn-ghost text-xs px-3 py-1.5 min-h-0 flex-1 sm:flex-none">
            {isLive ? "Watch Live" : isDone ? "View Result" : "Details"}
          </Link>
          {isAdmin && (
            <>
              {isUpcoming && (
                <Link href={`/admin/matches/${m.id}/score`} className="btn-primary text-xs px-3 py-1.5 min-h-0 flex-1 sm:flex-none">
                  Start →
                </Link>
              )}
              {isLive && (
                <Link href={`/admin/matches/${m.id}/score`} className="btn-gold text-xs px-3 py-1.5 min-h-0 flex-1 sm:flex-none">
                  Score Now
                </Link>
              )}
              {isDone && (
                <Link href={`/admin/matches/${m.id}/score`} className="btn-ghost text-xs px-3 py-1.5 min-h-0 flex-1 sm:flex-none">
                  Manage
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function CricketScore({ m }: { m: MatchTileData }) {
  const lines = cricketLines(m);
  if (lines.length === 0) {
    // not started — show teams head-to-head
    return (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Team team={m.teamA} alignRight />
        <span className="text-slate-500 font-display text-lg">VS</span>
        <Team team={m.teamB} />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {lines.map((l, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-sm sm:text-base truncate flex-1">{l.teamName}</span>
          <span className="font-display text-lg sm:text-xl whitespace-nowrap">
            {l.runs}<span className="text-slate-500">/{l.wickets}</span>
            <span className="text-xs text-slate-400 ml-1">({l.overs})</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function FootballScore({ m }: { m: MatchTileData }) {
  const { a, b } = footballScore(m);
  if (m.status === "UPCOMING") {
    return (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Team team={m.teamA} alignRight />
        <span className="text-slate-500 font-display text-lg">VS</span>
        <Team team={m.teamB} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="min-w-0 text-right">
        <p className="text-sm sm:text-base truncate" style={{ color: m.teamA.primaryColor }}>{m.teamA.name}</p>
      </div>
      <p className="font-display text-2xl sm:text-3xl text-center whitespace-nowrap">
        <span className={a > b ? "text-white" : "text-slate-500"}>{a}</span>
        <span className="text-slate-600 mx-2">–</span>
        <span className={b > a ? "text-white" : "text-slate-500"}>{b}</span>
      </p>
      <div className="min-w-0 text-left">
        <p className="text-sm sm:text-base truncate" style={{ color: m.teamB.primaryColor }}>{m.teamB.name}</p>
      </div>
    </div>
  );
}

function Team({ team, alignRight }: { team: TeamSlim; alignRight?: boolean }) {
  return (
    <div className={`min-w-0 ${alignRight ? "text-right" : "text-left"}`}>
      <span className="inline-block w-2 h-2 rounded-full mb-1" style={{ backgroundColor: team.primaryColor }} />
      <p className="text-sm sm:text-base font-medium truncate" style={{ color: team.primaryColor }}>{team.name}</p>
    </div>
  );
}
