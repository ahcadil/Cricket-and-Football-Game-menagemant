import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { BudgetBar } from "@/components/team/BudgetBar";
import { RosterTable } from "@/components/team/RosterTable";
import { MatchCard } from "@/components/match/MatchCard";

export const dynamic = "force-dynamic";

export default async function TeamDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      players: { include: { user: { select: { name: true } } } },
      matchesA: { include: { teamA: true, teamB: true, winner: true }, orderBy: { scheduledAt: "desc" } },
      matchesB: { include: { teamA: true, teamB: true, winner: true }, orderBy: { scheduledAt: "desc" } },
    },
  });
  if (!team) notFound();

  const matches = [...team.matchesA, ...team.matchesB].sort((a, b) => +b.scheduledAt - +a.scheduledAt);

  return (
    <div className="space-y-6">
      <header className="card" style={{ borderTop: `4px solid ${team.primaryColor}` }}>
        <div className="flex flex-wrap items-start gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center font-display text-2xl sm:text-3xl ring-1 ring-white/10 overflow-hidden shrink-0" style={{ backgroundColor: team.primaryColor + "33" }}>
            {team.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
              : team.name.slice(0,1)}
          </div>
          <div className="flex-1 min-w-[180px]">
            <h1 className="text-2xl sm:text-4xl break-words">{team.name}</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1 break-words">
              {team.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"} · Owner: {team.owner.name}
            </p>
            {team.tagline && <p className="italic mt-2 text-sm sm:text-base text-slate-300">"{team.tagline}"</p>}
          </div>
          <div className="w-full md:w-72">
            <p className="label">Budget</p>
            <BudgetBar budget={team.budget} spent={team.spent} squadCount={team.players.length} />
          </div>
        </div>
      </header>

      <Card>
        <h2 className="text-2xl mb-3">Roster ({team.players.length})</h2>
        <RosterTable players={team.players} sport={team.sport} />
      </Card>

      <section>
        <h2 className="text-2xl mb-3">Fixtures & Results</h2>
        {matches.length === 0 ? <p className="text-slate-400 text-sm">No matches scheduled.</p> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map(m => <MatchCard key={m.id} m={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}
