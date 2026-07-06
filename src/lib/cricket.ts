// Pure, server-safe cricket scoring derivation.
//
// Everything a live scorecard shows (batting/bowling figures, extras, fall of
// wickets, this-over, run rates, chase math) is derived here from the raw
// CricketEvent stream for ONE innings. We deliberately DO NOT read the stored
// `event.over` / `event.ball` (buggy: off-by-one at over end, never renumbered
// after an undo) nor `innings.extras` (only counts wide/no-ball penalties).
// Overs and extras are recomputed from the ordered legal-ball sequence instead.
//
// `innings.runs` from the DB IS trustworthy (the server keeps it in sync); the
// derived `totalRuns` below is expected to equal it — see the assertion in
// scripts/verify-cricket or the dev self-check.

import type { ExtraType, WicketType } from "@/lib/enums";
import { fmtOvers } from "@/lib/format";

export interface BallInput {
  id: string;
  batsmanId: string | null;
  bowlerId: string | null;
  runs: number;
  isWicket: boolean;
  wicketType: WicketType | null;
  extraType: ExtraType | null;
}

export interface Charge {
  teamRuns: number;   // runs added to the team total for this delivery
  batRuns: number;    // runs credited to the striker
  bowlerRuns: number; // runs charged to the bowler's analysis
  legal: boolean;     // counts toward the over (a legal delivery)
  faced: boolean;     // counts as a ball faced by the striker
}

/** Per-delivery accounting — the single source of truth for all aggregates. */
export function chargeFor(b: BallInput): Charge {
  const runs = b.runs || 0;
  switch (b.extraType) {
    case "NOBALL":
      return { teamRuns: runs + 1, batRuns: runs, bowlerRuns: runs + 1, legal: false, faced: true };
    case "WIDE":
      return { teamRuns: runs + 1, batRuns: 0, bowlerRuns: runs + 1, legal: false, faced: false };
    case "BYE":
      return { teamRuns: runs, batRuns: 0, bowlerRuns: 0, legal: true, faced: true };
    case "LEGBYE":
      return { teamRuns: runs, batRuns: 0, bowlerRuns: 0, legal: true, faced: true };
    default:
      return { teamRuns: runs, batRuns: runs, bowlerRuns: runs, legal: true, faced: true };
  }
}

export interface BatCard {
  batsmanId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number; // runs per 100 balls, 0 if no balls faced
  isOut: boolean;
  dismissal: string | null;
}

export interface BowlCard {
  bowlerId: string;
  balls: number;      // legal balls bowled
  overs: string;      // "O.b"
  maidens: number;
  runs: number;       // runs conceded
  wickets: number;    // excludes run outs
  economy: number;    // runs per over, 0 if no balls
}

export interface ExtrasBreakdown {
  wides: number;
  noballs: number;
  byes: number;
  legbyes: number;
  total: number;
}

export interface FowEntry {
  wicketNumber: number;
  score: number;              // team score when the wicket fell (incl. this ball)
  batsmanId: string | null;   // who was out (striker on the ball)
  overs: string;              // over.ball at which it fell
}

export interface InningsCard {
  batting: BatCard[];   // order of first appearance
  bowling: BowlCard[];  // order of first appearance
  extras: ExtrasBreakdown;
  fow: FowEntry[];
  thisOver: BallInput[]; // deliveries of the current (incomplete) over
  totalRuns: number;
  wickets: number;
  legalBalls: number;
}

function dismissalText(w: WicketType | null, bowlerName: string | null): string {
  const b = bowlerName ?? "bowler";
  switch (w) {
    case "BOWLED":    return `b ${b}`;
    case "LBW":       return `lbw b ${b}`;
    case "CAUGHT":    return `c & b ${b}`;
    case "STUMPED":   return `st b ${b}`;
    case "HITWICKET": return `hit wkt b ${b}`;
    case "RUNOUT":    return "run out";
    default:          return "out";
  }
}

/**
 * Build the full innings card from the ball stream (sorted oldest → newest).
 * `nameOf` resolves a playerId to a display name for dismissal strings (optional).
 */
export function buildInningsCard(
  balls: BallInput[],
  nameOf: (playerId: string | null) => string | null = () => null,
): InningsCard {
  const batting = new Map<string, BatCard>();
  const bowling = new Map<string, BowlCard>();
  const extras: ExtrasBreakdown = { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 0 };
  const fow: FowEntry[] = [];

  // over buckets: each entry is the list of deliveries in that over
  const overs: BallInput[][] = [[]];
  let legalInOver = 0;

  let totalRuns = 0;
  let wickets = 0;
  let legalBalls = 0;

  const bat = (id: string): BatCard => {
    let c = batting.get(id);
    if (!c) {
      c = { batsmanId: id, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, dismissal: null };
      batting.set(id, c);
    }
    return c;
  };
  const bowl = (id: string): BowlCard => {
    let c = bowling.get(id);
    if (!c) {
      c = { bowlerId: id, balls: 0, overs: "0.0", maidens: 0, runs: 0, wickets: 0, economy: 0 };
      bowling.set(id, c);
    }
    return c;
  };

  for (const b of balls) {
    const ch = chargeFor(b);
    totalRuns += ch.teamRuns;

    // extras breakdown
    if (b.extraType === "WIDE") extras.wides += ch.teamRuns;         // penalty + wide runs
    else if (b.extraType === "NOBALL") extras.noballs += 1;          // the no-ball penalty only
    else if (b.extraType === "BYE") extras.byes += b.runs;
    else if (b.extraType === "LEGBYE") extras.legbyes += b.runs;

    // batting
    if (b.batsmanId) {
      const c = bat(b.batsmanId);
      c.runs += ch.batRuns;
      if (ch.faced) c.balls += 1;
      if ((b.extraType === null || b.extraType === "NOBALL") && b.runs === 4) c.fours += 1;
      if ((b.extraType === null || b.extraType === "NOBALL") && b.runs === 6) c.sixes += 1;
    }

    // bowling
    if (b.bowlerId) {
      const c = bowl(b.bowlerId);
      c.runs += ch.bowlerRuns;
      if (ch.legal) c.balls += 1;
      if (b.isWicket && b.wicketType !== "RUNOUT") c.wickets += 1;
    }

    // over bucketing (drives maidens + this-over)
    overs[overs.length - 1].push(b);
    if (ch.legal) {
      legalBalls += 1;
      legalInOver += 1;
      if (legalInOver === 6) {
        overs.push([]);
        legalInOver = 0;
      }
    }

    // wicket + fall of wickets
    if (b.isWicket) {
      wickets += 1;
      if (b.batsmanId) {
        const c = bat(b.batsmanId);
        c.isOut = true;
        c.dismissal = dismissalText(b.wicketType, nameOf(b.bowlerId));
      }
      fow.push({
        wicketNumber: wickets,
        score: totalRuns,
        batsmanId: b.batsmanId,
        overs: fmtOvers(legalBalls),
      });
    }
  }

  extras.total = extras.wides + extras.noballs + extras.byes + extras.legbyes;

  // finalize batting derived fields
  for (const c of batting.values()) {
    c.strikeRate = c.balls > 0 ? (c.runs / c.balls) * 100 : 0;
  }

  // finalize bowling derived fields + maidens (completed 6-legal-ball overs only)
  const maidensByBowler = new Map<string, number>();
  for (const over of overs) {
    const legal = over.filter(b => chargeFor(b).legal);
    if (legal.length !== 6) continue; // incomplete over — not counted
    const conceded = over.reduce((s, b) => s + chargeFor(b).bowlerRuns, 0);
    if (conceded !== 0) continue;
    // credit the bowler who bowled this over's legal balls (assume one bowler/over)
    const bowlerId = legal[0]?.bowlerId ?? null;
    if (bowlerId) maidensByBowler.set(bowlerId, (maidensByBowler.get(bowlerId) ?? 0) + 1);
  }
  for (const c of bowling.values()) {
    c.maidens = maidensByBowler.get(c.bowlerId) ?? 0;
    c.overs = fmtOvers(c.balls);
    c.economy = c.balls > 0 ? c.runs / (c.balls / 6) : 0;
  }

  const thisOver = overs[overs.length - 1];

  return {
    batting: [...batting.values()],
    bowling: [...bowling.values()],
    extras,
    fow,
    thisOver,
    totalRuns,
    wickets,
    legalBalls,
  };
}

export interface ChaseInfo {
  target: number;
  runsNeeded: number;
  ballsRemaining: number;
  requiredRunRate: number | null; // null when no balls remain
  done: boolean;                   // target reached
}

/** Second-innings chase math. `target` = first innings runs + 1. */
export function chaseInfo(
  target: number,
  runs: number,
  legalBalls: number,
  oversPerSide: number | null,
): ChaseInfo {
  const totalBalls = oversPerSide ? oversPerSide * 6 : 0;
  const ballsRemaining = Math.max(0, totalBalls - legalBalls);
  const runsNeeded = Math.max(0, target - runs);
  const requiredRunRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : null;
  return { target, runsNeeded, ballsRemaining, requiredRunRate, done: runs >= target };
}

export function currentRunRate(runs: number, legalBalls: number): number {
  return legalBalls > 0 ? runs / (legalBalls / 6) : 0;
}

export function projectedScore(
  runs: number,
  legalBalls: number,
  oversPerSide: number | null,
): number | null {
  if (!oversPerSide || legalBalls === 0) return null;
  return Math.round((runs / legalBalls) * 6 * oversPerSide);
}
