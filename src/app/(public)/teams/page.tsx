import { prisma } from "@/lib/db";
import { TeamCard } from "@/components/team/TeamCard";

export const dynamic = "force-dynamic";

export default async function PublicTeamsPage() {
  const teams = await prisma.team.findMany({
    include: { _count: { select: { players: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-4xl">Teams</h1>
      {teams.length === 0 ? (
        <p className="text-slate-400 text-sm">No teams yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(t => <TeamCard key={t.id} team={t} />)}
        </div>
      )}
    </div>
  );
}
