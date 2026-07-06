"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";

interface Innings {
  id: string; order: number; runs: number; wickets: number; ballsBowled: number; battingTeamId: string; closed: boolean;
}
interface Event {
  id: string; over: number; ball: number; runs: number; isWicket: boolean; extraType: string | null;
  wicketType: string | null; note: string | null; batsman?: { user: { name: string } } | null; bowler?: { user: { name: string } } | null;
}
interface MatchSlim {
  id: string; status: string; teamA: { id: string; name: string; primaryColor: string };
  teamB: { id: string; name: string; primaryColor: string }; oversPerSide: number | null;
}

interface Props {
  match: MatchSlim; innings: Innings[]; events: Event[];
}

function fmtOvers(balls: number) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function CricketScoreboard({ match, innings, events }: Props) {
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (match.status !== "LIVE") return;
    const es = new EventSource(`/api/matches/${match.id}/stream`);
    es.onmessage = () => setBump(b => b + 1);
    return () => es.close();
  }, [match.id, match.status]);

  // bump is unused visually but forces server-component refresh via parent if you want full refresh
  // here we just rely on the server-rendered values + revalidatePath. For a smoother UX we'd
  // mutate local state — for MVP a quick window.location.reload-style is fine.
  useEffect(() => { if (bump > 0) window.location.reload(); }, [bump]);

  const teamFor = (id: string) => (id === match.teamA.id ? match.teamA : match.teamB);
  const last6 = events.slice(-6).reverse();

  return (
    <div className="space-y-4">
      {innings.map(inn => {
        const team = teamFor(inn.battingTeamId);
        const overs = fmtOvers(inn.ballsBowled);
        const crr = inn.ballsBowled > 0 ? (inn.runs / (inn.ballsBowled / 6)).toFixed(2) : "0.00";
        const projected = match.oversPerSide && inn.ballsBowled > 0
          ? Math.round((inn.runs / inn.ballsBowled) * 6 * match.oversPerSide)
          : null;
        return (
          <div key={inn.id} className="card">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0" style={{ backgroundColor: team.primaryColor }} />
                <h3 className="text-base sm:text-xl truncate">{team.name}</h3>
                {inn.closed && <Badge tone="slate">closed</Badge>}
              </div>
              <p className="text-2xl sm:text-3xl font-display whitespace-nowrap">
                {inn.runs}<span className="text-slate-500">/{inn.wickets}</span>
                <span className="text-base sm:text-xl text-slate-400 ml-2">({overs})</span>
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-slate-300">
              <div><span className="text-slate-500 text-xs uppercase block">CRR</span>{crr}</div>
              {projected && <div><span className="text-slate-500 text-xs uppercase block">Projected</span>{projected}</div>}
              {match.oversPerSide && (
                <div><span className="text-slate-500 text-xs uppercase block">Overs</span>{overs}/{match.oversPerSide}</div>
              )}
            </div>
          </div>
        );
      })}

      {last6.length > 0 && (
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">This Over (latest first)</p>
          <div className="flex gap-2 flex-wrap">
            {last6.map(e => (
              <span key={e.id} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ring-1 ring-white/10
                ${e.isWicket ? "bg-red-500/30 text-red-300" : e.extraType ? "bg-sky-500/20 text-sky-200" : "bg-white/5"}`}>
                {e.isWicket ? "W" : e.extraType ? (e.extraType[0] + (e.runs || "")) : e.runs}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Ball-by-ball Commentary</p>
        {events.length === 0 ? <p className="text-sm text-slate-500">No balls bowled yet.</p> : (
          <ul className="divide-y divide-white/5 text-sm max-h-96 overflow-y-auto">
            {[...events].reverse().map(e => (
              <li key={e.id} className="py-2">
                <span className="text-slate-500 text-xs mr-2">{e.over}.{e.ball}</span>
                <span className="text-slate-200">
                  {e.bowler?.user.name ?? "Bowler"} to {e.batsman?.user.name ?? "Batter"},{" "}
                  {e.isWicket
                    ? <span className="text-red-400">OUT ({e.wicketType ?? ""})</span>
                    : e.extraType
                      ? <span className="text-sky-300">{e.extraType.toLowerCase()} +{e.runs}</span>
                      : `${e.runs} run${e.runs === 1 ? "" : "s"}`}
                </span>
                {e.note && <p className="text-xs text-slate-500 mt-0.5">{e.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
