import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { markOnBlockAction, reopenPlayerAction, setStartingBidAction, undoAllSalesAction } from "@/server/actions/auction";
import { AssignToTeamForm } from "@/components/auction/AssignToTeamForm";
import { formatMoney, formatM, tierFromBasePrice } from "@/lib/validators";
import Link from "next/link";
import { AdminLotSpotlight } from "@/components/auction/AdminLotSpotlight";
import { budgetView, SQUAD_SIZE, MIN_PLAYER_PRICE } from "@/lib/auction";
import { isAuctionLocked } from "@/lib/auctionLock";
import { AuctionLockModal } from "@/components/auction/AuctionLockModal";

export const dynamic = "force-dynamic";

export default async function AdminAuctionPage() {
  const { locked, completedCount } = await isAuctionLocked();

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
    prisma.team.findMany({
      select: {
        id: true, name: true, sport: true, budget: true, spent: true, primaryColor: true,
        players: { where: { status: "SOLD" }, select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
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

  const teamSlim = teams.map(t => {
    const budget = Number(t.budget);
    const spent = Number(t.spent);
    const bv = budgetView({ budget, spent, squadCount: t.players.length });
    return {
      id: t.id, name: t.name, sport: t.sport,
      remaining: bv.remaining, squadCount: bv.squadCount, slotsLeft: bv.slotsLeft,
      full: bv.full, perPlayer: bv.perPlayer, maxBid: bv.maxBid,
    };
  });

  const soldHistory = sold.map(s => ({
    id: s.id,
    name: s.user.name,
    photoUrl: s.photoUrl,
    soldPrice: Number(s.soldPrice ?? 0),
    teamName: s.team?.name ?? "Team",
    teamColor: s.team?.primaryColor ?? "#1aae72",
    soldAt: s.soldAt ? new Date(s.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
  }));

  return (
    <div className="space-y-6">
      {locked && <AuctionLockModal completedCount={completedCount} isAdmin={true} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">Auction Control</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {sold.length > 0 && (
            <form action={undoAllSalesAction}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-300 bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition cursor-pointer flex items-center gap-1"
                title="Reset all sold players in one click"
              >
                ↺ Undo All Sales ({sold.length})
              </button>
            </form>
          )}
          <Link href="/auction" className="btn-ghost text-xs w-full sm:w-auto" target="_blank">Open Public View ↗</Link>
        </div>
      </div>

      {/* COMPACT HIGH-DENSITY TEAM BUDGET BOARD */}
      <div>
        <div className="flex items-baseline justify-between mb-2.5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🛡️ Franchise Budgets ({teams.length})</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Squad Target: {SQUAD_SIZE} players · Min Reserve: {formatM(MIN_PLAYER_PRICE)}/slot</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {teams.map(t => {
            const bv = budgetView({ budget: t.budget, spent: t.spent, squadCount: t.players.length });
            const pct = Math.min(100, Math.round((bv.squadCount / SQUAD_SIZE) * 100));
            const isLowReserve = !bv.full && bv.perPlayer < MIN_PLAYER_PRICE;

            return (
              <div
                key={t.id}
                className="card !p-3 space-y-2 ring-1 ring-white/10 hover:ring-white/30 transition bg-gradient-to-b from-black/40 to-pitch-dark"
                style={{ borderTop: `3px solid ${t.primaryColor}` }}
              >
                <div className="flex items-center gap-1.5 min-w-0 justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.primaryColor }} />
                    <p className="font-bold text-xs truncate text-white" title={t.name}>{t.name}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{t.sport === "CRICKET" ? "🏏" : "⚽"}</span>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-display text-brand-300">{formatM(bv.remaining)}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{bv.squadCount}/{SQUAD_SIZE}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    spent {formatM(t.spent)} / {formatM(t.budget)}
                  </p>
                </div>

                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all ${bv.full ? "bg-brand-400" : isLowReserve ? "bg-red-400" : "bg-gold-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] pt-0.5 border-t border-white/5">
                  <div>
                    <span className="text-slate-500 block">Per Slot</span>
                    <span className={`font-bold ${bv.full ? "text-slate-400" : isLowReserve ? "text-red-400" : "text-slate-200"}`}>
                      {bv.full ? "Complete" : formatM(bv.perPlayer)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Max Bid</span>
                    <span className="font-bold text-gold-300">
                      {bv.full ? "—" : formatM(bv.maxBid)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="!p-5 sm:!p-6 overflow-hidden relative border border-gold-400/30 bg-gradient-to-br from-pitch-light/80 via-black/90 to-pitch-dark">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <h2 className="text-lg sm:text-xl font-normal text-white tracking-wide">Currently On Block</h2>
          </div>
          {onBlock && (
            <span className="chip ring-gold-400/50 bg-gold-500/10 text-gold-300 font-mono text-xs font-normal">
              Lot #{onBlock.id.slice(-4).toUpperCase()}
            </span>
          )}
        </div>

        {onBlock ? (
          <>
            {/* HERO PLAYER BANNER & DETAILS (REAL-TIME SSE SYNCED CLIENT COMPONENT) */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-4 pb-4 border-b border-white/10">
              <AdminLotSpotlight
                initial={{
                  id: onBlock.id,
                  name: onBlock.user.name,
                  sport: onBlock.sport,
                  photoUrl: onBlock.photoUrl,
                  basePrice: Number(onBlock.basePrice),
                  role: onBlock.sport === "CRICKET" ? onBlock.cricketRole : onBlock.footballPosition,
                  session: onBlock.session,
                  experienceYears: onBlock.experienceYears,
                }}
              />

              {/* COMPACT STARTING BID PRESET BAR (NORMAL FONT WEIGHT) */}
              <div className="flex flex-col items-center md:items-end gap-1.5 shrink-0 bg-black/60 p-2.5 rounded-2xl ring-1 ring-gold-400/40 w-full md:w-auto">
                <span className="text-[11px] font-normal text-gold-300 flex items-center gap-1 uppercase tracking-wider">
                  ⚡ Set Base Price:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {[
                    { label: "Set 50M", value: 50_000_000 },
                    { label: "10M", value: 10_000_000 },
                    { label: "20M", value: 20_000_000 },
                    { label: "100M", value: 100_000_000 },
                  ].map(preset => (
                    <form key={preset.value} action={setStartingBidAction}>
                      <input type="hidden" name="playerId" value={onBlock.id} />
                      <input type="hidden" name="basePrice" value={preset.value} />
                      <button
                        type="submit"
                        className={`px-2.5 py-1 rounded-lg text-xs font-normal transition ring-1 cursor-pointer active:scale-95 ${
                          Number(onBlock.basePrice) === preset.value
                            ? "bg-gold-500 text-pitch-dark ring-gold-300 shadow-md shadow-gold-500/30 scale-[1.02]"
                            : "bg-black/50 text-gold-300 ring-white/10 hover:bg-gold-500/20 hover:ring-gold-400/50"
                        }`}
                      >
                        {preset.label}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </div>

            <AssignToTeamForm
              playerId={onBlock.id}
              basePrice={Number(onBlock.basePrice)}
              sport={onBlock.sport}
              teams={teamSlim}
              soldHistory={soldHistory}
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
                      <span className="text-gold-400 font-mono text-xs font-semibold">{formatM(Number(p.basePrice))}</span>
                    </div>
                  </div>
                  <form action={markOnBlockAction}>
                    <input type="hidden" name="playerId" value={p.id} />
                    <button className="btn-gold text-xs font-normal cursor-pointer">Put on Block</button>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <div>
                  <p className="text-xs font-bold text-white">Total Completed Sales: {sold.length} players</p>
                  <p className="text-[11px] text-slate-400">Click below to undo all sales and refund team budgets in one click.</p>
                </div>
                <form action={undoAllSalesAction}>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-red-300 bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition cursor-pointer flex items-center gap-1.5"
                  >
                    ↺ Undo All Sales
                  </button>
                </form>
              </div>

              <ul className="space-y-2">
                {sold.map(p => (
                  <li key={p.id} className="card p-3 flex items-center gap-3">
                    <Avatar name={p.user.name} src={p.photoUrl} size={36} />
                    <div className="flex-1">
                      <p className="text-sm font-normal text-white">{p.user.name}</p>
                      <p className="text-xs font-normal" style={{ color: p.team?.primaryColor }}>{p.team?.name}</p>
                    </div>
                    <span className="text-gold-400 text-sm font-mono font-normal">{p.soldPrice ? formatM(Number(p.soldPrice)) : ""}</span>
                    <form action={reopenPlayerAction}>
                      <input type="hidden" name="playerId" value={p.id} />
                      <button className="btn-ghost text-xs">Undo</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
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
