import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PlayerOnBlock } from "@/components/auction/PlayerOnBlock";
import { isAuctionLocked } from "@/lib/auctionLock";
import { AuctionLockModal } from "@/components/auction/AuctionLockModal";

export const dynamic = "force-dynamic";

export default async function PublicAuctionPage() {
  const sess = await getSession();
  const { locked, completedCount } = await isAuctionLocked();

  const [onBlock, recent, userTeam] = await Promise.all([
    prisma.playerProfile.findFirst({
      where: { status: "ON_AUCTION" },
      include: { user: { select: { name: true } }, team: true },
    }),
    prisma.auctionLog.findMany({
      take: 10,
      orderBy: { soldAt: "desc" },
      include: { player: { include: { user: { select: { name: true } } } }, team: true },
    }),
    sess?.uid
      ? prisma.team.findUnique({
          where: { ownerId: sess.uid },
          include: { _count: { select: { players: true } } },
        })
      : null,
  ]);

  return (
    <div className="space-y-6">
      {locked && <AuctionLockModal completedCount={completedCount} isAdmin={sess?.role === "ADMIN"} />}
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="label flex items-center gap-2"><span className="live-dot" /> Live broadcast</p>
          <h1 className="text-3xl sm:text-5xl heading-fire">The Auction Floor</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">
            Players go up one at a time. {userTeam ? "Place live bids directly for your franchise!" : "Hammer down at any moment."}
          </p>
        </div>
      </header>

      <PlayerOnBlock
        initial={onBlock ? {
          id: onBlock.id,
          name: onBlock.user.name,
          sport: onBlock.sport,
          photoUrl: onBlock.photoUrl,
          basePrice: Number(onBlock.basePrice),
          role: onBlock.sport === "CRICKET" ? onBlock.cricketRole : onBlock.footballPosition,
        } : null}
        initialLiveBid={onBlock?.soldPrice && onBlock?.team ? {
          teamId: onBlock.team.id,
          teamName: onBlock.team.name,
          primaryColor: onBlock.team.primaryColor,
          bidAmount: Number(onBlock.soldPrice),
        } : null}
        initialRecent={recent.map(r => ({
          playerId: r.player.id,
          name: r.player.user.name,
          teamName: r.team.name,
          soldPrice: Number(r.soldPrice),
          primaryColor: r.team.primaryColor,
        }))}
        userTeam={userTeam ? {
          id: userTeam.id,
          name: userTeam.name,
          sport: userTeam.sport,
          primaryColor: userTeam.primaryColor,
          budget: Number(userTeam.budget),
          spent: Number(userTeam.spent),
          squadCount: userTeam._count.players,
        } : null}
      />
    </div>
  );
}
