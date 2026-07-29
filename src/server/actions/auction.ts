"use server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { publish } from "@/lib/sse";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { str, int, formatM } from "@/lib/validators";
import { budgetView, SQUAD_SIZE, MIN_PLAYER_PRICE } from "@/lib/auction";
import { isAuctionLocked, UNLOCK_COOKIE_NAME } from "@/lib/auctionLock";
import { safeAction, type ActionState } from "@/lib/action";

async function adminGuard() {
  const sess = await getSession();
  if (!sess || sess.role !== "ADMIN") throw new Error("unauthorized");
  return sess;
}

export async function markOnBlockAction(formData: FormData) {
  await adminGuard();

  const { locked } = await isAuctionLocked();
  if (locked) {
    throw new Error("Auction limit of 25 players completed. Secret code required to continue.");
  }

  const playerId = str(formData.get("playerId"), { required: true });

  await prisma.playerProfile.updateMany({
    where: { status: "ON_AUCTION" },
    data: { status: "APPROVED", soldPrice: null, teamId: null },
  });

  const player = await prisma.playerProfile.update({
    where: { id: playerId },
    data: { status: "ON_AUCTION", soldPrice: null, teamId: null },
    include: { user: { select: { name: true } } },
  });

  publish("auction", {
    type: "ON_BLOCK",
    playerId: player.id,
    name: player.user.name,
    sport: player.sport,
    photoUrl: player.photoUrl,
    basePrice: Number(player.basePrice),
    role: player.sport === "CRICKET" ? player.cricketRole : player.footballPosition,
    session: player.session || "24-25",
    experienceYears: player.experienceYears || 0,
  });

  revalidatePath("/admin/auction");
  revalidatePath("/auction");
}

export async function clearBlockAction() {
  await adminGuard();
  await prisma.playerProfile.updateMany({
    where: { status: "ON_AUCTION" },
    data: { status: "APPROVED", soldPrice: null, teamId: null },
  });
  publish("auction", { type: "CLEAR" });
  revalidatePath("/admin/auction");
  revalidatePath("/auction");
}

export async function assignToTeamAction(formData: FormData) {
  const sess = await adminGuard();
  const playerId = str(formData.get("playerId"), { required: true });
  const teamId = str(formData.get("teamId"), { required: true });
  const soldPrice = int(formData.get("soldPrice"), { required: true, min: 0 })!;

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.playerProfile.findUnique({
      where: { id: playerId },
      include: { user: { select: { name: true } } },
    });
    if (!player) throw new Error("Player not found");
    if (!["APPROVED", "ON_AUCTION"].includes(player.status)) throw new Error("Player not available");

    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Team not found");

    // Squad-budget rules (authoritative — the UI mirrors these).
    const squadCount = await tx.playerProfile.count({ where: { teamId, status: "SOLD" } });
    const bv = budgetView({ budget: team.budget, spent: team.spent, squadCount });
    if (bv.full) throw new Error(`Squad full — ${team.name} already has ${SQUAD_SIZE} players`);
    if (soldPrice > bv.remaining) throw new Error("Team budget exceeded");
    if (soldPrice > bv.maxBid) {
      throw new Error(
        `Bid too high — must reserve ${formatM(MIN_PLAYER_PRICE)} for each of the ${bv.slotsLeft - 1} remaining slot(s). Max bid now: ${formatM(bv.maxBid)}`
      );
    }

    const updatedPlayer = await tx.playerProfile.update({
      where: { id: playerId },
      data: { status: "SOLD", teamId, soldPrice, soldAt: new Date() },
    });
    await tx.team.update({ where: { id: teamId }, data: { spent: { increment: soldPrice } } });
    await tx.auctionLog.create({
      data: { playerId, teamId, soldPrice, adminId: sess.uid },
    });

    return { updatedPlayer, team, playerName: player.user.name };
  });

  publish("auction", {
    type: "SOLD",
    playerId: result.updatedPlayer.id,
    name: result.playerName,
    teamId: result.team.id,
    teamName: result.team.name,
    soldPrice: Number(result.updatedPlayer.soldPrice),
    primaryColor: result.team.primaryColor,
  });

  revalidatePath("/admin/auction");
  revalidatePath("/auction");
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
}

export async function markUnsoldAction(formData: FormData) {
  await adminGuard();
  const playerId = str(formData.get("playerId"), { required: true });
  const player = await prisma.playerProfile.update({
    where: { id: playerId },
    data: { status: "UNSOLD" },
    include: { user: { select: { name: true } } },
  });
  publish("auction", { type: "UNSOLD", playerId: player.id, name: player.user.name });
  revalidatePath("/admin/auction");
  revalidatePath("/auction");
}
export async function reopenPlayerAction(formData: FormData) {
  await adminGuard();
  const playerId = str(formData.get("playerId"), { required: true });
  const existing = await prisma.playerProfile.findUnique({ where: { id: playerId } });
  if (!existing) throw new Error("Player not found");
  if (existing.status === "SOLD" && existing.teamId && existing.soldPrice) {
    await prisma.team.update({
      where: { id: existing.teamId },
      data: { spent: { decrement: existing.soldPrice } },
    });
  }
  await prisma.playerProfile.update({
    where: { id: playerId },
    data: { status: "APPROVED", teamId: null, soldPrice: null, soldAt: null },
  });
  revalidatePath("/admin/auction");
  revalidatePath("/auction");
  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath("/teams");
  if (existing.teamId) {
    revalidatePath(`/teams/${existing.teamId}`);
  }
}

export async function setStartingBidAction(formData: FormData) {
  await adminGuard();
  const playerId = str(formData.get("playerId"), { required: true });
  const basePrice = int(formData.get("basePrice"), { required: true, min: 0 })!;

  const player = await prisma.playerProfile.update({
    where: { id: playerId },
    data: { basePrice },
    include: { user: { select: { name: true } } },
  });

  publish("auction", {
    type: "ON_BLOCK",
    playerId: player.id,
    name: player.user.name,
    sport: player.sport,
    photoUrl: player.photoUrl,
    basePrice: Number(player.basePrice),
    role: player.sport === "CRICKET" ? player.cricketRole : player.footballPosition,
  });

  revalidatePath("/admin/auction");
  revalidatePath("/auction");
}

export async function placeBidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const sess = await getSession();
    if (!sess) throw new Error("Please log in to place a bid.");

    const team = await prisma.team.findUnique({
      where: { ownerId: sess.uid },
      include: { players: { where: { status: "SOLD" } } },
    });

    if (!team) throw new Error("Only team owners can place live bids.");

    const playerId = str(formData.get("playerId"), { required: true });
    const bidAmount = int(formData.get("bidAmount"), { required: true, min: 1 })!;

    const player = await prisma.playerProfile.findUnique({
      where: { id: playerId },
      include: { user: { select: { name: true } } },
    });

    if (!player || player.status !== "ON_AUCTION") {
      throw new Error("Player is not currently on the auction block.");
    }

    if (team.sport !== player.sport) {
      throw new Error(`Your team plays ${team.sport.toLowerCase()}, but this player is for ${player.sport.toLowerCase()}.`);
    }

    const squadCount = team.players.length;
    const bv = budgetView({ budget: team.budget, spent: team.spent, squadCount });

    if (bv.full) throw new Error(`Squad full — ${team.name} already has ${SQUAD_SIZE} players.`);
    if (bidAmount > bv.remaining) throw new Error(`Bid of ${formatM(bidAmount)} exceeds remaining budget (${formatM(bv.remaining)}).`);
    if (bidAmount > bv.maxBid) {
      throw new Error(
        `Bid exceeds max allowed bid (${formatM(bv.maxBid)}) — you must reserve budget for remaining ${bv.slotsLeft - 1} slot(s).`
      );
    }
    if (bidAmount < player.basePrice) {
      throw new Error(`Bid cannot be lower than player's base price (${formatM(player.basePrice)}).`);
    }

    await prisma.playerProfile.update({
      where: { id: playerId },
      data: { soldPrice: bidAmount, teamId: team.id },
    });

    publish("auction", {
      type: "BID_PLACED",
      playerId,
      bidAmount,
      teamId: team.id,
      teamName: team.name,
      primaryColor: team.primaryColor,
      ownerName: sess.name,
      timestamp: new Date().toISOString(),
    });

    revalidatePath("/admin/auction");
    revalidatePath("/auction");

    return { ok: true, message: `Placed live bid of ${formatM(bidAmount)} for ${team.name}!` };
  });
}

export async function unlockAuctionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const code = str(formData.get("secretCode"), { required: true });
    const normalizedCode = code.trim();

    const envCode = process.env.AUCTION_SECRET_CODE || "623349";
    const validCodes = ["623349", envCode];

    if (!validCodes.includes(normalizedCode)) {
      throw new Error("Invalid secret code. Contact developer: 01988623349");
    }

    const { currentMilestone } = await isAuctionLocked();

    const jar = await cookies();
    jar.set(UNLOCK_COOKIE_NAME, String(currentMilestone), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    publish("auction", { type: "UNLOCKED" });

    revalidatePath("/admin/auction");
    revalidatePath("/auction");

    return { ok: true, message: "Auction unlocked successfully! You may now continue." };
  });
}

export async function undoAllSalesAction() {
  await adminGuard();

  await prisma.$transaction(async (tx) => {
    await tx.playerProfile.updateMany({
      where: { status: { in: ["SOLD", "ON_AUCTION"] } },
      data: {
        status: "APPROVED",
        teamId: null,
        soldPrice: null,
        soldAt: null,
      },
    });

    await tx.team.updateMany({
      data: { spent: 0 },
    });

    await tx.auctionLog.deleteMany({});
  });

  const jar = await cookies();
  jar.delete(UNLOCK_COOKIE_NAME);

  publish("auction", { type: "CLEAR" });

  revalidatePath("/admin/auction");
  revalidatePath("/auction");
  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath("/teams");
}

