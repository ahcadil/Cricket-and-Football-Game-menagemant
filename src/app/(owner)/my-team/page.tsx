import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { BudgetBar } from "@/components/team/BudgetBar";
import { RosterTable } from "@/components/team/RosterTable";
import { MatchCard } from "@/components/match/MatchCard";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my-team");
  if (user.role === "ADMIN") redirect("/admin/teams");

  const team = await prisma.team.findUnique({
    where: { ownerId: user.id },
    include: {
      players: { include: { user: { select: { name: true } } } },
      matchesA: { include: { teamA: true, teamB: true, winner: true } },
      matchesB: { include: { teamA: true, teamB: true, winner: true } },
    },
  });

  if (!team) {
    return <Card><p className="text-slate-300">No team assigned to you yet. Contact the organizer.</p></Card>;
  }

  const matches = [...team.matchesA, ...team.matchesB].sort((a, b) => +b.scheduledAt - +a.scheduledAt);

  return (
    <div className="space-y-6">
      <header className="card" style={{ borderTop: `4px solid ${team.primaryColor}` }}>
        <div className="flex flex-wrap gap-4 sm:gap-5 items-start">
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs uppercase tracking-widest text-slate-400">My Team</p>
            <h1 className="text-2xl sm:text-4xl break-words">{team.name}</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">{team.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"}</p>
            <Link href={`/teams/${team.id}`} className="text-brand-400 text-sm mt-2 inline-block">Public team page →</Link>
          </div>
          <div className="w-full md:w-80">
            <p className="label">Auction Budget</p>
            <BudgetBar budget={team.budget} spent={team.spent} squadCount={team.players.length} />
          </div>
        </div>
      </header>

      <Card>
        <h2 className="text-2xl mb-3">Squad ({team.players.length})</h2>
        <RosterTable players={team.players} sport={team.sport} />
      </Card>

      <section>
        <h2 className="text-2xl mb-3">Matches</h2>
        {matches.length === 0 ? <p className="text-slate-400 text-sm">No matches yet.</p> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map(m => <MatchCard key={m.id} m={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}
