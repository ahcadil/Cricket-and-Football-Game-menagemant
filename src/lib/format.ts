// Display helpers — relative time, score lines, etc.

export function formatRelative(date: Date): string {
  const now = Date.now();
  const target = date.getTime();
  const diffMs = target - now;
  const absMs = Math.abs(diffMs);
  const sec = Math.round(absMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  const future = diffMs > 0;

  if (sec < 60) return future ? "in moments" : "just now";
  if (min < 60) return future ? `in ${min}m` : `${min}m ago`;
  if (hr < 24) return future ? `in ${hr}h` : `${hr}h ago`;
  if (day < 7) return future ? `in ${day}d` : `${day}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtOvers(balls: number) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export interface FootballSlim { type: string; teamId: string }
export function footballScore(match: { teamAId: string; teamBId: string; footballEvents: FootballSlim[] }) {
  const a = match.footballEvents.filter(e => e.type === "GOAL" && e.teamId === match.teamAId).length
          + match.footballEvents.filter(e => e.type === "OWN_GOAL" && e.teamId === match.teamBId).length;
  const b = match.footballEvents.filter(e => e.type === "GOAL" && e.teamId === match.teamBId).length
          + match.footballEvents.filter(e => e.type === "OWN_GOAL" && e.teamId === match.teamAId).length;
  return { a, b };
}

export interface InningsSlim {
  battingTeamId: string;
  order: number;
  runs: number;
  wickets: number;
  ballsBowled: number;
  closed: boolean;
}
export function cricketLines(match: { teamAId: string; innings: InningsSlim[]; teamA: { name: string }; teamB: { name: string } }) {
  return match.innings.map(inn => {
    const teamName = inn.battingTeamId === match.teamAId ? match.teamA.name : match.teamB.name;
    return {
      teamName,
      runs: inn.runs,
      wickets: inn.wickets,
      overs: fmtOvers(inn.ballsBowled),
      closed: inn.closed,
    };
  });
}
