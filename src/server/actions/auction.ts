"use server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { publish } from "@/lib/sse";
import { revalidatePath } from "next/cache";
import { str, int } from "@/lib/validators";

async function adminGuard() {
  const sess = await getSession();
  if (!sess || sess.role !== "ADMIN") throw new Error("unauthorized");
  return sess;
}

export async function markOnBlockAction(formData: FormData) {
  await adminGuard();
  const playerId = str(formData.get("playerId"), { required: true });

  await prisma.playerProfile.updateMany({
    where: { status: "ON_AUCTION" },
    data: { status: "APPROVED" },
  });

  const player = await prisma.playerProfile.update({
    where: { id: playerId },
    data: { status: "ON_AUCTION" },
    include: { user: { select: { name: true } } },
  });

  publish("auction", {
    type: "ON_BLOCK",
    playerId: player.id,
    name: player.user.name,
    sport: player.sport,
    photoUrl: player.photoUrl,
    basePrice: player.basePrice,
    role: player.sport === "CRICKET" ? player.cricketRole : player.footballPosition,
  });

  revalidatePath("/admin/auction");
  revalidatePath("/auction");
}

export async function clearBlockAction() {
  await adminGuard();
  await prisma.playerProfile.updateMany({
    where: { status: "ON_AUCTION" },
    data: { status: "APPROVED" },
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
    // Cross-sport assignment is allowed; budget is the only hard limit.
    if (team.budget - team.spent < soldPrice) throw new Error("Team budget exceeded");

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
    soldPrice,
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
  revalidatePath("/teams");
}
