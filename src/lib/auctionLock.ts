import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const UNLOCK_COOKIE_NAME = "auction_unlocked_milestone";
export const BATCH_SIZE = 13;
export const DEVELOPER_INFO = "Developed by AHC ADIL , CONTRACT:01988623349";

export async function getCompletedAuctionCount(): Promise<number> {
  const count = await prisma.playerProfile.count({
    where: { status: { in: ["SOLD", "UNSOLD"] } },
  });
  return count;
}

export async function isAuctionLocked(): Promise<{
  locked: boolean;
  completedCount: number;
  currentMilestone: number;
}> {
  const completedCount = await getCompletedAuctionCount();
  const currentMilestone = Math.floor(completedCount / BATCH_SIZE);

  if (currentMilestone === 0) {
    return { locked: false, completedCount, currentMilestone: 0 };
  }

  const jar = await cookies();
  const val = jar.get(UNLOCK_COOKIE_NAME)?.value;
  const unlockedMilestone = val ? parseInt(val, 10) : 0;

  const locked = unlockedMilestone < currentMilestone;
  return { locked, completedCount, currentMilestone };
}
