import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface Props {
  m: {
    id: string; sport: string; status: string;
    scheduledAt: Date; venue: string | null;
    teamA: { name: string; primaryColor: string };
    teamB: { name: string; primaryColor: string };
    winner?: { name: string } | null;
  };
}

export function MatchCard({ m }: Props) {
  const isLive = m.status === "LIVE";
  const isDone = m.status === "FINISHED";
  return (
    <Link
      href={`/matches/${m.id}`}
      className="relative block overflow-hidden rounded-2xl ring-1 ring-white/10 hover:ring-white/30 hover:-translate-y-0.5 transition group"
      style={{
        background: `linear-gradient(135deg, ${m.teamA.primaryColor}1f 0%, transparent 50%, ${m.teamB.primaryColor}1f 100%)`,
      }}
    >
      {/* Top color slash */}
      <div className="absolute inset-x-0 top-0 h-1 flex">
        <div style={{ backgroundColor: m.teamA.primaryColor }} className="flex-1" />
        <div style={{ backgroundColor: m.teamB.primaryColor }} className="flex-1" />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          {isLive ? (
            <span className="chip ring-red-400/60 bg-red-500/15 text-red-300 animate-pulse">
              <span className="live-dot" /> LIVE
            </span>
          ) : isDone ? (
            <Badge tone="slate">Final</Badge>
          ) : (
            <Badge tone="brand">Upcoming</Badge>
          )}
          <span className="text-xs text-slate-400">{m.sport === "CRICKET" ? "🏏" : "⚽"} {m.sport}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Team team={m.teamA} alignRight />
          <span className="text-slate-500 font-display text-lg">VS</span>
          <Team team={m.teamB} />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span className="truncate">{new Date(m.scheduledAt).toLocaleString()}</span>
          {m.venue && <span className="truncate ml-2">📍 {m.venue}</span>}
        </div>
        {m.winner && (
          <p className="mt-2 text-xs text-gold-400">🏆 {m.winner.name}</p>
        )}
      </div>
    </Link>
  );
}

function Team({ team, alignRight }: { team: { name: string; primaryColor: string }; alignRight?: boolean }) {
  return (
    <div className={`min-w-0 ${alignRight ? "text-right" : "text-left"}`}>
      <span className="inline-block w-2.5 h-2.5 rounded-full mb-1" style={{ backgroundColor: team.primaryColor }} />
      <p className="text-sm sm:text-base font-medium truncate" style={{ color: team.primaryColor }}>{team.name}</p>
    </div>
  );
}
