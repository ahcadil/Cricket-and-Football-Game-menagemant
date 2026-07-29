import { prisma } from "@/lib/db";
import { AdminPlayerManager } from "@/components/player/AdminPlayerManager";

export const dynamic = "force-dynamic";

export default async function AdminPlayersPage() {
  const [submitted, approved, rejected, totalValuation] = await Promise.all([
    prisma.playerProfile.findMany({
      where: { status: "SUBMITTED" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.playerProfile.findMany({
      where: { status: { in: ["APPROVED", "ON_AUCTION", "UNSOLD", "SOLD"] } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.playerProfile.findMany({
      where: { status: "REJECTED" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.playerProfile.aggregate({
      _sum: { basePrice: true },
    }),
  ]);

  return (
    <AdminPlayerManager
      submitted={submitted as any}
      approved={approved as any}
      rejected={rejected as any}
      totalPoolValuation={Number(totalValuation._sum.basePrice ?? 0)}
    />
  );
}
