import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { MatchTile, type MatchTileData } from "@/components/match/MatchTile";
import { LiveSpotlight } from "@/components/match/LiveSpotlight";
import { SportFilter } from "@/components/match/SportFilter";

export const dynamic = "force-dynamic";

interface Search { sport?: string; mine?: string }

export default async function PublicMatchesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  // Determine "my team" id for highlighting and filtering
  let myTeamId: string | null = null;
  if (user?.ownedTeam) myTeamId = user.ownedTeam.id;
  else if (user?.playerProfile?.teamId) myTeamId = user.playerProfile.teamId;

  // Build the where filter
  const sportFilter = sp.sport === "CRICKET" || sp.sport === "FOOTBALL" ? sp.sport : null;
  const mineOnly = sp.mine === "1" && myTeamId;

  const where: Prisma.MatchWhereInput = {};
  if (sportFilter) where.sport = sportFilter;
  if (mineOnly && myTeamId) where.OR = [{ teamAId: myTeamId }, { teamBId: myTeamId }];

  const matches = await prisma.match.findMany({
    where,
    include: {
      teamA: { select: { id: true, name: true, primaryColor: true } },
      teamB: { select: { id: true, name: true, primaryColor: true } },
      winner: { select: { name: true } },
      motm: { include: { user: { select: { name: true } } } },
      innings: {
        select: { battingTeamId: true, order: true, runs: true, wickets: true, ballsBowled: true, closed: true },
        orderBy: { order: "asc" },
      },
      footballEvents: { select: { type: true, teamId: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const all = matches as MatchTileData[];
  const live = all.filter(m => m.status === "LIVE");
  const upcoming = all.filter(m => m.status === "UPCOMING");
  const finished = all.filter(m => m.status === "FINISHED").sort((a, b) => +b.scheduledAt - +a.scheduledAt);

  // Today's matches (any status)
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endToday = startToday + 86_400_000;
  const todayCount = all.filter(m => {
    const t = +m.scheduledAt;
    return t >= startToday && t < endToday;
  }).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* HEADER */}
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="label flex items-center gap-2">
            {live.length > 0 && <span className="live-dot" />}
            Match Center
          </p>
          <h1 className="text-3xl sm:text-5xl heading-gradient">
            {live.length > 0 ? "Live & Upcoming" : upcoming.length > 0 ? "Fixtures" : "All Matches"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {live.length > 0
              ? `${live.length} match${live.length === 1 ? "" : "es"} in progress right now.`
              : `${upcoming.length} upcoming · ${finished.length} played.`}
          </p>
        </div>
        {isAdmin && (
          <Link href="/admin/matches" className="btn-primary text-xs sm:text-sm">
            + Schedule Match
          </Link>
        )}
      </header>

      {/* FILTER PILLS */}
      <SportFilter hasTeam={myTeamId !== null} />

      {/* STATS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Live" value={live.length} icon="📡" accent={live.length > 0} />
        <StatTile label="Today" value={todayCount} icon="📅" />
        <StatTile label="Upcoming" value={upcoming.length} icon="⏳" />
        <StatTile label="Played" value={finished.length} icon="🏁" />
      </section>

      {/* LIVE SPOTLIGHTS */}
      {live.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl"><span className="heading-fire">Live Now</span></h2>
          <div className="grid lg:grid-cols-2 gap-4">
            {live.map(m => <LiveSpotlight key={m.id} m={m} isAdmin={isAdmin} />)}
          </div>
        </section>
      )}

      {/* MY TEAM HIGHLIGHTS (only when not already filtered to mine) */}
      {myTeamId && sp.mine !== "1" && (() => {
        const mine = all.filter(m => m.teamAId === myTeamId || m.teamBId === myTeamId);
        if (mine.length === 0) return null;
        const upcomingMine = mine.filter(m => m.status === "UPCOMING").slice(0, 3);
        if (upcomingMine.length === 0) return null;
        return (
          <section className="space-y-4">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <h2 className="text-2xl">⭐ Your Next Matches</h2>
              <Link href="/matches?mine=1" className="text-sm text-brand-400 hover:underline">See all yours →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {upcomingMine.map(m => <MatchTile key={m.id} m={m} highlight isAdmin={isAdmin} />)}
            </div>
          </section>
        );
      })()}

      {/* MAIN BODY — TABS */}
      <section>
        <Tabs items={[
          {
            label: `Upcoming (${upcoming.length})`,
            content: <MatchGrid
              list={upcoming}
              empty="No matches scheduled yet."
              isAdmin={isAdmin}
              myTeamId={myTeamId}
            />,
          },
          {
            label: `Results (${finished.length})`,
            content: <MatchGrid
              list={finished}
              empty="No matches played yet."
              isAdmin={isAdmin}
              myTeamId={myTeamId}
            />,
          },
          {
            label: `All (${all.length})`,
            content: <MatchGrid
              list={all}
              empty="No matches match this filter."
              isAdmin={isAdmin}
              myTeamId={myTeamId}
            />,
          },
        ]} />
      </section>
    </div>
  );
}

function MatchGrid({ list, empty, isAdmin, myTeamId }: {
  list: MatchTileData[]; empty: string; isAdmin?: boolean; myTeamId: string | null;
}) {
  if (list.length === 0) {
    return (
      <Card className="text-center py-12">
        <div className="text-5xl opacity-40">📭</div>
        <p className="mt-3 text-slate-400">{empty}</p>
      </Card>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {list.map(m => (
        <MatchTile
          key={m.id}
          m={m}
          isAdmin={isAdmin}
          highlight={!!myTeamId && (m.teamAId === myTeamId || m.teamBId === myTeamId)}
        />
      ))}
    </div>
  );
}

function StatTile({ label, value, icon, accent }: { label: string; value: number; icon: string; accent?: boolean }) {
  return (
    <div className={`card ${accent ? "ring-red-500/40" : ""}`}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400">{label}</p>
        <span className="text-base sm:text-lg opacity-60">{icon}</span>
      </div>
      <p className={`mt-1 sm:mt-2 text-3xl sm:text-4xl font-display ${accent ? "text-red-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
