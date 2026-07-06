"use client";
import { useEffect, useState } from "react";

interface Event {
  id: string; minute: number; type: string; teamId: string; note: string | null;
  team: { name: string; primaryColor: string };
  player?: { user: { name: string } } | null;
}
interface MatchSlim {
  id: string; status: string;
  teamA: { id: string; name: string; primaryColor: string };
  teamB: { id: string; name: string; primaryColor: string };
}

export function FootballScoreboard({ match, events }: { match: MatchSlim; events: Event[] }) {
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (match.status !== "LIVE") return;
    const es = new EventSource(`/api/matches/${match.id}/stream`);
    es.onmessage = () => setBump(b => b + 1);
    return () => es.close();
  }, [match.id, match.status]);
  useEffect(() => { if (bump > 0) window.location.reload(); }, [bump]);

  // compute score
  const aGoals = events.filter(e => e.type === "GOAL" && e.teamId === match.teamA.id).length
               + events.filter(e => e.type === "OWN_GOAL" && e.teamId === match.teamB.id).length;
  const bGoals = events.filter(e => e.type === "GOAL" && e.teamId === match.teamB.id).length
               + events.filter(e => e.type === "OWN_GOAL" && e.teamId === match.teamA.id).length;

  const icon = (t: string) => t === "GOAL" || t === "OWN_GOAL" ? "⚽" : t === "YELLOW" ? "🟨" : t === "RED" ? "🟥" : t === "PENALTY" ? "🎯" : t === "MISSED_PEN" ? "❌" : "🔄";

  return (
    <div className="space-y-4">
      <div className="card !p-5 sm:!p-8">
        <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">
          <div className="text-right min-w-0">
            <p className="text-base sm:text-2xl truncate">{match.teamA.name}</p>
            <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: match.teamA.primaryColor }} />
          </div>
          <p className="text-3xl sm:text-5xl font-display text-center whitespace-nowrap">
            {aGoals} <span className="text-slate-500">–</span> {bGoals}
          </p>
          <div className="text-left min-w-0">
            <p className="text-base sm:text-2xl truncate">{match.teamB.name}</p>
            <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: match.teamB.primaryColor }} />
          </div>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Match Events</p>
        {events.length === 0 ? <p className="text-sm text-slate-500">No events yet.</p> : (
          <ul className="space-y-2">
            {[...events].sort((a, b) => a.minute - b.minute).map(e => (
              <li key={e.id} className="flex items-center gap-2 sm:gap-3 text-sm">
                <span className="w-8 sm:w-10 text-slate-400 text-xs shrink-0">{e.minute}'</span>
                <span className="w-6 sm:w-7 text-center shrink-0">{icon(e.type)}</span>
                <span className="flex-1 min-w-0 truncate">
                  <span style={{ color: e.team.primaryColor }}>{e.team.name}</span>
                  {e.player && <> · {e.player.user.name}</>}
                  {e.note && <span className="text-slate-500"> — {e.note}</span>}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 shrink-0">{e.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
