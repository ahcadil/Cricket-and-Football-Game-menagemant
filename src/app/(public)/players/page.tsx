import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PlayerCard } from "@/components/player/PlayerCard";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

interface Search { sport?: string; role?: string; q?: string; status?: string }

export default async function PublicPlayersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;

  const where: Prisma.PlayerProfileWhereInput = {
    status: sp.status === "APPROVED" || sp.status === "ON_AUCTION" || sp.status === "SOLD" || sp.status === "UNSOLD"
      ? sp.status
      : { in: ["APPROVED", "ON_AUCTION", "SOLD", "UNSOLD"] },
  };
  if (sp.sport === "CRICKET" || sp.sport === "FOOTBALL") where.sport = sp.sport;
  if (sp.role) {
    if (sp.sport === "FOOTBALL") where.footballPosition = sp.role as never;
    else where.cricketRole = sp.role as never;
  }
  if (sp.q) where.user = { name: { contains: sp.q } };

  const players = await prisma.playerProfile.findMany({
    where,
    include: { user: { select: { name: true } }, team: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { basePrice: "desc" }],
    take: 60,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-4xl">Players</h1>
      <Card>
        <form className="grid md:grid-cols-4 gap-3" action="/players" method="GET">
          <div>
            <label className="label">Search</label>
            <input name="q" defaultValue={sp.q ?? ""} placeholder="name…" className="input" />
          </div>
          <div>
            <label className="label">Sport</label>
            <select name="sport" defaultValue={sp.sport ?? ""} className="input">
              <option value="">All</option>
              <option value="CRICKET">Cricket</option>
              <option value="FOOTBALL">Football</option>
            </select>
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" defaultValue={sp.role ?? ""} className="input">
              <option value="">All</option>
              <optgroup label="Cricket">
                <option value="BAT">Batter</option>
                <option value="BOWL">Bowler</option>
                <option value="AR">All-rounder</option>
                <option value="WK">Wicket-keeper</option>
              </optgroup>
              <optgroup label="Football">
                <option value="GK">Goalkeeper</option>
                <option value="DEF">Defender</option>
                <option value="MID">Midfielder</option>
                <option value="FWD">Forward</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={sp.status ?? ""} className="input">
              <option value="">All listed</option>
              <option value="APPROVED">Approved</option>
              <option value="ON_AUCTION">On Auction</option>
              <option value="SOLD">Sold</option>
              <option value="UNSOLD">Unsold</option>
            </select>
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button className="btn-primary">Filter</button>
            <Link href="/players" className="btn-ghost">Reset</Link>
          </div>
        </form>
      </Card>

      {players.length === 0 ? (
        <p className="text-slate-400 text-sm">No players match these filters.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map(p => (
            <PlayerCard key={p.id} p={p} href={`/players/${p.id}`} showStatus />
          ))}
        </div>
      )}
    </div>
  );
}
