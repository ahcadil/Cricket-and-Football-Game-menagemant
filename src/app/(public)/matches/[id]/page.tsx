import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CricketScoreboard } from "@/components/match/CricketScoreboard";
import { FootballScoreboard } from "@/components/match/FootballScoreboard";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      teamA: true, teamB: true, winner: true,
      motm: { include: { user: { select: { name: true } } } },
      tossWinner: true,
      innings: { orderBy: { order: "asc" } },
      cricketEvents: {
        include: {
          batsman: { include: { user: { select: { name: true } } } },
          bowler: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      footballEvents: { include: { team: true, player: { include: { user: { select: { name: true } } } } } },
    },
  });
  if (!match) notFound();

  return (
    <div className="space-y-6">
      <header className="card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge tone={match.status === "LIVE" ? "red" : "slate"}>
              {match.status === "LIVE" ? "● LIVE" : match.status}
            </Badge>
            <span className="text-xs text-slate-400">{match.sport === "CRICKET" ? "🏏" : "⚽"} {match.sport}</span>
          </div>
          <p className="text-xs text-slate-400">{new Date(match.scheduledAt).toLocaleString()} {match.venue && `· ${match.venue}`}</p>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <Link href={`/teams/${match.teamAId}`} className="text-lg sm:text-2xl hover:text-brand-300 truncate text-right sm:text-left">{match.teamA.name}</Link>
          <span className="text-slate-500 font-display text-base sm:text-xl">vs</span>
          <Link href={`/teams/${match.teamBId}`} className="text-lg sm:text-2xl hover:text-brand-300 truncate">{match.teamB.name}</Link>
        </div>
        {match.tossWinner && (
          <p className="mt-3 text-sm text-slate-400">
            Toss: <span className="text-slate-200">{match.tossWinner.name}</span> chose to {match.tossDecision?.toLowerCase()}
          </p>
        )}
        {match.winner && <p className="mt-3 text-gold-400">🏆 Winner: {match.winner.name}</p>}
        {match.motm && <p className="text-sm text-gold-300">MOTM: {match.motm.user.name}</p>}
      </header>

      {match.sport === "CRICKET" ? (
        <CricketScoreboard
          match={{ id: match.id, status: match.status, teamA: match.teamA, teamB: match.teamB, oversPerSide: match.oversPerSide }}
          innings={match.innings}
          events={match.cricketEvents}
        />
      ) : (
        <FootballScoreboard
          match={{ id: match.id, status: match.status, teamA: match.teamA, teamB: match.teamB }}
          events={match.footballEvents}
        />
      )}
    </div>
  );
}
