import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { startMatchAction, endMatchAction } from "@/server/actions/match";
import { CricketScoringPanel, FootballScoringPanel } from "@/components/match/ScoringPanel";
import { CricketLiveHeader } from "@/components/match/CricketLiveHeader";
import { CricketScorecard } from "@/components/match/CricketScorecard";
import { buildInningsCard, type BallInput } from "@/lib/cricket";

export const dynamic = "force-dynamic";

export default async function AdminScorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      teamA: { include: { players: { include: { user: { select: { name: true } } } } } },
      teamB: { include: { players: { include: { user: { select: { name: true } } } } } },
      innings: { orderBy: { order: "asc" } },
      cricketEvents: { orderBy: { createdAt: "asc" } },
      footballEvents: { orderBy: { minute: "asc" } },
    },
  });
  if (!match) notFound();

  const allPlayers = [
    ...match.teamA.players.map(p => ({ id: p.id, name: p.user.name, teamId: match.teamAId })),
    ...match.teamB.players.map(p => ({ id: p.id, name: p.user.name, teamId: match.teamBId })),
  ];
  const openInnings = match.innings.find(i => !i.closed);
  const nameOf = (id: string | null) => allPlayers.find(p => p.id === id)?.name ?? "—";

  // Derive the live scorecard for the open innings from the raw ball stream.
  const openBalls: BallInput[] = openInnings
    ? match.cricketEvents
        .filter(e => e.inningsId === openInnings.id)
        .map(e => ({
          id: e.id, batsmanId: e.batsmanId, bowlerId: e.bowlerId,
          runs: e.runs, isWicket: e.isWicket,
          wicketType: e.wicketType as BallInput["wicketType"],
          extraType: e.extraType as BallInput["extraType"],
        }))
    : [];
  const openCard = openInnings ? buildInningsCard(openBalls, nameOf) : null;

  const battingTeamName = openInnings
    ? (openInnings.battingTeamId === match.teamAId ? match.teamA.name : match.teamB.name)
    : "";
  const battingTeamColor = openInnings
    ? (openInnings.battingTeamId === match.teamAId ? match.teamA.primaryColor : match.teamB.primaryColor)
    : "#ffffff";
  const firstInnings = match.innings.find(i => i.order === 1) ?? null;
  const targetBase = openInnings && openInnings.order === 2 ? (firstInnings?.runs ?? 0) : null;

  // Seed the panel's client-side crease state from the most recent deliveries.
  const lastBall = openBalls[openBalls.length - 1] ?? null;
  const seedStriker = lastBall?.batsmanId ?? null;
  const seedNonStriker = [...openBalls].reverse().map(b => b.batsmanId).find(id => id && id !== seedStriker) ?? null;
  const seedBowler = lastBall?.bowlerId ?? null;
  const outIds = openBalls.filter(b => b.isWicket && b.batsmanId).map(b => b.batsmanId as string);

  return (
    <div className="space-y-6">
      <header className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl">Live Scoring</h1>
          <p className="text-sm text-slate-400 break-words">{match.teamA.name} vs {match.teamB.name}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Badge tone={match.status === "LIVE" ? "red" : "slate"}>
            {match.status === "LIVE" ? "● LIVE" : match.status}
          </Badge>
          <Link href={`/matches/${match.id}`} target="_blank" className="btn-ghost text-xs">Public View ↗</Link>
        </div>
      </header>

      {match.status === "UPCOMING" && (
        <Card>
          <h2 className="text-xl mb-3">Start Match</h2>
          <form action={startMatchAction} className="grid md:grid-cols-3 gap-3 items-end">
            <input type="hidden" name="id" value={match.id} />
            {match.sport === "CRICKET" && (
              <>
                <Field label="Toss Winner">
                  <Select name="tossWinnerId" defaultValue="">
                    <option value="">— skip toss —</option>
                    <option value={match.teamAId}>{match.teamA.name}</option>
                    <option value={match.teamBId}>{match.teamB.name}</option>
                  </Select>
                </Field>
                <Field label="Toss Decision">
                  <Select name="tossDecision" defaultValue="BAT">
                    <option value="BAT">Bat first</option>
                    <option value="BOWL">Bowl first</option>
                  </Select>
                </Field>
              </>
            )}
            <button className="btn-primary">Start Match</button>
          </form>
        </Card>
      )}

      {match.status === "LIVE" && match.sport === "CRICKET" && openInnings && openCard && (
        <>
          <CricketLiveHeader
            battingTeam={battingTeamName}
            primaryColor={battingTeamColor}
            runs={openInnings.runs}
            wickets={openInnings.wickets}
            legalBalls={openCard.legalBalls}
            oversPerSide={match.oversPerSide}
            inningsOrder={openInnings.order}
            targetBase={targetBase}
          />
          <div className="grid lg:grid-cols-[1fr_1fr] gap-6 items-start">
            <CricketScoringPanel
              matchId={match.id}
              inningsId={openInnings.id}
              players={{
                batting: allPlayers.filter(p => p.teamId === openInnings.battingTeamId),
                bowling: allPlayers.filter(p => p.teamId !== openInnings.battingTeamId),
              }}
              recentEvents={match.cricketEvents.filter(e => e.inningsId === openInnings.id).map(e => ({
                id: e.id, over: e.over, ball: e.ball, runs: e.runs, isWicket: e.isWicket, extraType: e.extraType,
              }))}
              seed={{ strikerId: seedStriker, nonStrikerId: seedNonStriker, bowlerId: seedBowler, ballsThisOver: openCard.legalBalls % 6 }}
              outIds={outIds}
            />
            <div className="space-y-4">
              <CricketScorecard
                card={openCard}
                nameOf={nameOf}
                battingTeam={battingTeamName}
                strikerId={seedStriker}
                nonStrikerId={seedNonStriker}
              />
              {match.innings.length > 1 && (
                <Card>
                  <h3 className="text-sm mb-2 text-slate-300">Innings Summary</h3>
                  {match.innings.map(inn => {
                    const team = inn.battingTeamId === match.teamAId ? match.teamA : match.teamB;
                    return (
                      <p key={inn.id} className="text-sm">
                        Inn {inn.order}: {team.name} — <span className="font-display">{inn.runs}/{inn.wickets}</span>
                        {" "}<span className="text-slate-500">({Math.floor(inn.ballsBowled/6)}.{inn.ballsBowled%6})</span>
                        {inn.closed && <span className="text-xs text-slate-400 ml-2">closed</span>}
                      </p>
                    );
                  })}
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {match.status === "LIVE" && match.sport === "FOOTBALL" && (
        <FootballScoringPanel
          matchId={match.id}
          teams={[{ id: match.teamAId, name: match.teamA.name }, { id: match.teamBId, name: match.teamB.name }]}
          players={allPlayers}
          recentEvents={match.footballEvents.map(e => ({ id: e.id, minute: e.minute, type: e.type }))}
        />
      )}

      {match.status === "LIVE" && (
        <Card>
          <h2 className="text-xl mb-3">End Match</h2>
          <form action={endMatchAction} className="grid md:grid-cols-3 gap-3 items-end">
            <input type="hidden" name="id" value={match.id} />
            <Field label="Winner">
              <Select name="winnerId" defaultValue="">
                <option value="">Tie / No Result</option>
                <option value={match.teamAId}>{match.teamA.name}</option>
                <option value={match.teamBId}>{match.teamB.name}</option>
              </Select>
            </Field>
            <Field label="Man of the Match">
              <Select name="motmId" defaultValue="">
                <option value="">— none —</option>
                {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <button className="btn-gold">Finalize</button>
          </form>
        </Card>
      )}

      {match.status === "FINISHED" && (
        <Card>
          <p className="text-lg">Match concluded.</p>
        </Card>
      )}
    </div>
  );
}
