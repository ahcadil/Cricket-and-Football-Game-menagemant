import { prisma } from "@/lib/db";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";

export const dynamic = "force-dynamic";

export default async function PublicAuctionPage() {
  const onBlock = await prisma.playerProfile.findFirst({
    where: { status: "ON_AUCTION" },
    include: { user: { select: { name: true } } },
  });

  const recent = await prisma.auctionLog.findMany({
    take: 10,
    orderBy: { soldAt: "desc" },
    include: { player: { include: { user: { select: { name: true } } } }, team: true },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="label flex items-center gap-2"><span className="live-dot" /> Live broadcast</p>
          <h1 className="text-3xl sm:text-5xl heading-fire">The Auction Floor</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">Players go up one at a time. Hammer down at any moment.</p>
        </div>
      </header>

      <PlayerOnBlock
        initial={onBlock ? {
          id: onBlock.id,
          name: onBlock.user.name,
          sport: onBlock.sport,
          photoUrl: onBlock.photoUrl,
          basePrice: onBlock.basePrice,
          role: onBlock.sport === "CRICKET" ? onBlock.cricketRole : onBlock.footballPosition,
        } : null}
        initialRecent={recent.map(r => ({
          playerId: r.player.id,
          name: r.player.user.name,
          teamName: r.team.name,
          soldPrice: r.soldPrice,
          primaryColor: r.team.primaryColor,
        }))}
      />
    </div>
  );
}
