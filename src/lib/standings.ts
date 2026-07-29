import { prisma } from "./db";
import type { Sport } from "./enums";

export interface StandingRow {
  teamId: string;
  teamName: string;
  primaryColor: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  // cricket
  runsFor?: number;
  runsAgainst?: number;
  ballsFor?: number;
  ballsAgainst?: number;
  nrr?: number; // net run rate — the real cricket tiebreak
  // football
  goalsFor?: number;
  goalsAgainst?: number;
  diff?: number;
}

export async function getStandings(sport: Sport): Promise<StandingRow[]> {
  const teams = await prisma.team.findMany({ where: { sport } });
  const matches = await prisma.match.findMany({
    where: { sport, status: "FINISHED" },
    include: {
      innings: true,
      footballEvents: true,
    },
  });

  const rows = new Map<string, StandingRow>();
  for (const t of teams) {
    rows.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      primaryColor: t.primaryColor,
      played: 0, won: 0, lost: 0, tied: 0, points: 0,
      ...(sport === "CRICKET"
        ? { runsFor: 0, runsAgainst: 0, ballsFor: 0, ballsAgainst: 0, nrr: 0 }
        : { goalsFor: 0, goalsAgainst: 0, diff: 0 }),
    });
  }

  for (const m of matches) {
    const a = rows.get(m.teamAId);
    const b = rows.get(m.teamBId);
    if (!a || !b) continue;
    a.played++; b.played++;

    if (sport === "CRICKET") {
      const aInns = m.innings.filter(i => i.battingTeamId === m.teamAId);
      const bInns = m.innings.filter(i => i.battingTeamId === m.teamBId);
      const aRuns = aInns.reduce((s, i) => s + i.runs, 0);
      const bRuns = bInns.reduce((s, i) => s + i.runs, 0);
      const aBalls = aInns.reduce((s, i) => s + i.ballsBowled, 0);
      const bBalls = bInns.reduce((s, i) => s + i.ballsBowled, 0);
      a.runsFor! += aRuns; a.runsAgainst! += bRuns;
      b.runsFor! += bRuns; b.runsAgainst! += aRuns;
      a.ballsFor! += aBalls; a.ballsAgainst! += bBalls;
      b.ballsFor! += bBalls; b.ballsAgainst! += aBalls;
    } else {
      const aGoals = m.footballEvents.filter(e => e.type === "GOAL" && e.teamId === m.teamAId).length
                   + m.footballEvents.filter(e => e.type === "OWN_GOAL" && e.teamId === m.teamBId).length;
      const bGoals = m.footballEvents.filter(e => e.type === "GOAL" && e.teamId === m.teamBId).length
                   + m.footballEvents.filter(e => e.type === "OWN_GOAL" && e.teamId === m.teamAId).length;
      a.goalsFor! += aGoals; a.goalsAgainst! += bGoals;
      b.goalsFor! += bGoals; b.goalsAgainst! += aGoals;
      a.diff = a.goalsFor! - a.goalsAgainst!;
      b.diff = b.goalsFor! - b.goalsAgainst!;
    }

    if (!m.winnerId) {
      a.tied++; b.tied++;
      a.points += 1; b.points += 1;
    } else if (m.winnerId === m.teamAId) {
      a.won++; a.points += 2; b.lost++;
    } else {
      b.won++; b.points += 2; a.lost++;
    }
  }

  // Net Run Rate = (runsFor / oversFaced) − (runsAgainst / oversBowled)
  if (sport === "CRICKET") {
    for (const r of rows.values()) {
      const oversFor = (r.ballsFor ?? 0) / 6;
      const oversAgainst = (r.ballsAgainst ?? 0) / 6;
      const rateFor = oversFor > 0 ? (r.runsFor ?? 0) / oversFor : 0;
      const rateAgainst = oversAgainst > 0 ? (r.runsAgainst ?? 0) / oversAgainst : 0;
      r.nrr = Number((rateFor - rateAgainst).toFixed(3));
    }
  }

  return [...rows.values()].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (sport === "FOOTBALL") return (y.diff ?? 0) - (x.diff ?? 0);
    // cricket: tie-break by NRR, then total runs
    if ((y.nrr ?? 0) !== (x.nrr ?? 0)) return (y.nrr ?? 0) - (x.nrr ?? 0);
    return (y.runsFor ?? 0) - (x.runsFor ?? 0);
  });
}
