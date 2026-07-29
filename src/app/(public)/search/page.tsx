import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { PlayerCard } from "@/components/player/PlayerCard";
import { TeamCard } from "@/components/team/TeamCard";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [players, teams] = query
    ? await Promise.all([
        prisma.playerProfile.findMany({
          where: {
            status: { in: ["APPROVED", "ON_AUCTION", "SOLD", "UNSOLD"] },
            OR: [
              { user: { name: { contains: query } } },
              { city: { contains: query } },
            ],
          },
          include: { user: { select: { name: true } }, team: { select: { name: true } } },
          orderBy: [{ status: "asc" }, { basePrice: "desc" }],
          take: 24,
        }),
        prisma.team.findMany({
          where: { OR: [{ name: { contains: query } }, { tagline: { contains: query } }] },
          include: { _count: { select: { players: true } } },
          take: 12,
        }),
      ])
    : [[], []] as const;

  const total = players.length + teams.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Search</h1>
        <p className="text-sm text-slate-400 mt-1">Find players and teams across the tournament.</p>
      </div>

      <Card>
        <form action="/search" method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Search players, teams, cities…"
            className="input flex-1"
          />
          <button className="btn-primary shrink-0">Search</button>
        </form>
      </Card>

      {!query ? (
        <Card><p className="text-slate-400 text-sm">Type a name above to search.</p></Card>
      ) : total === 0 ? (
        <Card><p className="text-slate-400 text-sm">No players or teams match "{query}".</p></Card>
      ) : (
        <div className="space-y-8">
          {players.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl">Players <span className="text-slate-500 text-base">({players.length})</span></h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {players.map(p => <PlayerCard key={p.id} p={p} href={`/players/${p.id}`} showStatus />)}
              </div>
            </section>
          )}
          {teams.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl">Teams <span className="text-slate-500 text-base">({teams.length})</span></h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {teams.map(t => <TeamCard key={t.id} team={t} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <Link href="/players" className="text-sm text-brand-400 hover:underline inline-block">Browse all players →</Link>
    </div>
  );
}
