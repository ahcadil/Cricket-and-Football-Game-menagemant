import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { markOnBlockAction, reopenPlayerAction } from "@/server/actions/auction";
import { AssignToTeamForm } from "@/components/auction/AssignToTeamForm";
import { formatMoney, tierFromBasePrice } from "@/lib/validators";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAuctionPage() {
  const [onBlock, available, teams, sold, unsold] = await Promise.all([
    prisma.playerProfile.findFirst({
      where: { status: "ON_AUCTION" },
      include: { user: { select: { name: true } } },
    }),
    prisma.playerProfile.findMany({
      where: { status: "APPROVED" },
      include: { user: { select: { name: true } } },
      orderBy: { basePrice: "desc" },
    }),
    prisma.team.findMany({ select: { id: true, name: true, sport: true, budget: true, spent: true } }),
    prisma.playerProfile.findMany({
      where: { status: "SOLD" },
      include: { user: { select: { name: true } }, team: true },
      orderBy: { soldAt: "desc" },
    }),
    prisma.playerProfile.findMany({
      where: { status: "UNSOLD" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const teamSlim = teams.map(t => ({ id: t.id, name: t.name, sport: t.sport, remaining: t.budget - t.spent }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">Auction Control</h1>
        <Link href="/auction" className="btn-ghost text-xs w-full sm:w-auto" target="_blank">Open Public View ↗</Link>
      </div>

      <Card>
        <h2 className="text-lg sm:text-xl mb-3">Currently On Block</h2>
        {onBlock ? (
          <>
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <Avatar name={onBlock.user.name} src={onBlock.photoUrl} size={56} className="sm:!w-16 sm:!h-16 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xl sm:text-2xl truncate">{onBlock.user.name}</p>
                <p className="text-xs sm:text-sm text-slate-400 break-words">
                  {onBlock.sport === "CRICKET" ? "🏏" : "⚽"}
                  {" "}{onBlock.sport === "CRICKET" ? onBlock.cricketRole ?? "—" : onBlock.footballPosition ?? "—"}
                  {" · "}Base {formatMoney(onBlock.basePrice)} · Tier {tierFromBasePrice(onBlock.basePrice)}
                </p>
              </div>
            </div>
            <AssignToTeamForm
              playerId={onBlock.id}
              basePrice={onBlock.basePrice}
              sport={onBlock.sport}
              teams={teamSlim}
            />
          </>
        ) : (
          <p className="text-slate-400 text-sm">No player on block. Pick one from below.</p>
        )}
      </Card>

      <Tabs items={[
        {
          label: `Available (${available.length})`,
          content: available.length === 0 ? (
            <p className="text-slate-400 text-sm">No approved players waiting.</p>
          ) : (
            <ul className="grid md:grid-cols-2 gap-3">
              {available.map(p => (
                <li key={p.id} className="card p-4 flex items-center gap-3">
                  <Avatar name={p.user.name} src={p.photoUrl} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.user.name}</p>
                    <div className="flex gap-2 mt-0.5 text-xs">
                      <Badge tone="slate">{p.sport === "CRICKET" ? "🏏" : "⚽"} {p.sport === "CRICKET" ? p.cricketRole ?? "—" : p.footballPosition ?? "—"}</Badge>
                      <span className="text-gold-400">{formatMoney(p.basePrice)}</span>
                    </div>
                  </div>
                  <form action={markOnBlockAction}>
                    <input type="hidden" name="playerId" value={p.id} />
                    <button className="btn-gold text-xs">Put on Block</button>
                  </form>
                </li>
              ))}
            </ul>
          )
        },
        {
          label: `Sold (${sold.length})`,
          content: sold.length === 0 ? (
            <p className="text-slate-400 text-sm">No sales yet.</p>
          ) : (
            <ul className="space-y-2">
              {sold.map(p => (
                <li key={p.id} className="card p-3 flex items-center gap-3">
                  <Avatar name={p.user.name} src={p.photoUrl} size={36} />
                  <div className="flex-1">
                    <p className="text-sm">{p.user.name}</p>
                    <p className="text-xs" style={{ color: p.team?.primaryColor }}>{p.team?.name}</p>
                  </div>
                  <span className="text-gold-400 text-sm">{p.soldPrice ? formatMoney(p.soldPrice) : ""}</span>
                  <form action={reopenPlayerAction}>
                    <input type="hidden" name="playerId" value={p.id} />
                    <button className="btn-ghost text-xs">Undo</button>
                  </form>
                </li>
              ))}
            </ul>
          )
        },
        {
          label: `Unsold (${unsold.length})`,
          content: unsold.length === 0 ? (
            <p className="text-slate-400 text-sm">None.</p>
          ) : (
            <ul className="grid md:grid-cols-2 gap-2">
              {unsold.map(p => (
                <li key={p.id} className="card p-3 flex items-center gap-3">
                  <Avatar name={p.user.name} src={p.photoUrl} size={36} />
                  <p className="flex-1 text-sm">{p.user.name}</p>
                  <form action={reopenPlayerAction}>
                    <input type="hidden" name="playerId" value={p.id} />
                    <button className="btn-ghost text-xs">Reopen</button>
                  </form>
                </li>
              ))}
            </ul>
          )
        },
      ]} />
    </div>
  );
}
