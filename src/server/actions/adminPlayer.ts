"use server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { str, int, optStr, enumVal, email } from "@/lib/validators";
import { safeAction, type ActionState } from "@/lib/action";
import { convertGoogleDriveUrl } from "@/lib/bulkPlayers";
import { publish } from "@/lib/sse";

async function adminGuard() {
  const sess = await getSession();
  if (!sess || sess.role !== "ADMIN") throw new Error("unauthorized");
  return sess;
}

export async function approvePlayerAction(formData: FormData) {
  const sess = await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const basePrice = int(formData.get("basePrice"), { required: true, min: 0 })!;
  await prisma.playerProfile.update({
    where: { id },
    data: { status: "APPROVED", basePrice, approvedAt: new Date(), approvedById: sess.uid, rejectionNote: null },
  });
  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath(`/players/${id}`);
  revalidatePath("/admin/auction");
  revalidatePath("/auction");
}

export async function approveAllPendingPlayersAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const sess = await adminGuard();
    const defaultBasePriceRaw = formData.get("defaultBasePrice");
    const defaultBasePrice = defaultBasePriceRaw ? Math.max(0, Number(defaultBasePriceRaw) || 0) : null;

    const pendingCount = await prisma.playerProfile.count({ where: { status: "SUBMITTED" } });
    if (pendingCount === 0) throw new Error("No pending player submissions to approve.");

    if (defaultBasePrice !== null && defaultBasePrice > 0) {
      await prisma.playerProfile.updateMany({
        where: { status: "SUBMITTED" },
        data: {
          status: "APPROVED",
          basePrice: defaultBasePrice,
          approvedAt: new Date(),
          approvedById: sess.uid,
          rejectionNote: null,
        },
      });
    } else {
      await prisma.playerProfile.updateMany({
        where: { status: "SUBMITTED" },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: sess.uid,
          rejectionNote: null,
        },
      });
    }

    revalidatePath("/admin/players");
    revalidatePath("/players");
    revalidatePath("/admin/auction");
    revalidatePath("/auction");

    return { ok: true, message: `Successfully approved all ${pendingCount} pending player(s)!` };
  });
}

export async function rejectPlayerAction(formData: FormData) {
  await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const note = str(formData.get("note"), { required: true, max: 300 });
  await prisma.playerProfile.update({
    where: { id },
    data: { status: "REJECTED", rejectionNote: note },
  });
  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath(`/players/${id}`);
  revalidatePath("/admin/auction");
  revalidatePath("/auction");
}

export async function setBasePriceAction(formData: FormData) {
  await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const basePrice = int(formData.get("basePrice"), { required: true, min: 0 })!;
  await prisma.playerProfile.update({ where: { id }, data: { basePrice } });
  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath(`/players/${id}`);
  revalidatePath("/admin/auction");
  revalidatePath("/auction");
}

export async function updatePlayerAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await adminGuard();
    const id = str(formData.get("id"), { required: true });

    const player = await prisma.playerProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!player) throw new Error("Player not found");

    const name = str(formData.get("name"), { required: true, min: 2, max: 80 });
    const emailStr = email(formData.get("email"));
    const sport = (enumVal(formData.get("sport"), ["CRICKET", "FOOTBALL"] as const, false) ?? player.sport) as "CRICKET" | "FOOTBALL";
    const status = (enumVal(formData.get("status"), ["DRAFT", "SUBMITTED", "APPROVED", "ON_AUCTION", "SOLD", "REJECTED"] as const, false) ?? player.status) as any;
    const basePrice = int(formData.get("basePrice"), { required: true, min: 0 })!;

    const city = optStr(formData.get("city")) ?? player.city;
    const phone = optStr(formData.get("phone")) ?? player.phone;
    const expRaw = formData.get("experienceYears");
    const experienceYears = expRaw !== null && expRaw !== "" ? Math.max(0, Number(expRaw) || 0) : player.experienceYears;
    const bio = optStr(formData.get("bio")) ?? player.bio;
    const rawPhotoUrl = optStr(formData.get("photoUrl"));
    const photoUrl = rawPhotoUrl ? convertGoogleDriveUrl(rawPhotoUrl) : player.photoUrl;
    const session = optStr(formData.get("session")) || player.session || "24-25";

    const cricketRole = sport === "CRICKET" ? (optStr(formData.get("cricketRole")) ?? player.cricketRole ?? "BATSMAN") : null;
    const battingStyle = sport === "CRICKET" ? (optStr(formData.get("battingStyle")) ?? player.battingStyle) : null;
    const bowlingStyle = sport === "CRICKET" ? (optStr(formData.get("bowlingStyle")) ?? player.bowlingStyle) : null;

    const footballPosition = sport === "FOOTBALL" ? (optStr(formData.get("footballPosition")) ?? player.footballPosition ?? "FORWARD") : null;
    const preferredFoot = sport === "FOOTBALL" ? (optStr(formData.get("preferredFoot")) ?? player.preferredFoot) : null;
    const jerseyRaw = formData.get("jerseyNumber");
    const jerseyNumber = sport === "FOOTBALL" && jerseyRaw ? int(jerseyRaw, { min: 1, max: 99 }) : (sport === "FOOTBALL" ? player.jerseyNumber : null);

    const heightRaw = formData.get("heightCm");
    const heightCm = heightRaw ? int(heightRaw, { min: 50, max: 250 }) : player.heightCm;
    const weightRaw = formData.get("weightKg");
    const weightKg = weightRaw ? int(weightRaw, { min: 20, max: 250 }) : player.weightKg;

    // Check duplicate email if changed
    if (emailStr !== player.user.email) {
      const dup = await prisma.user.findUnique({ where: { email: emailStr } });
      if (dup && dup.id !== player.userId) {
        throw new Error(`Email "${emailStr}" is already registered by another account.`);
      }
    }

    await prisma.$transaction(async (tx) => {
      if (status === "ON_AUCTION") {
        await tx.playerProfile.updateMany({
          where: { status: "ON_AUCTION", id: { not: id } },
          data: { status: "APPROVED", soldPrice: null, teamId: null },
        });
      }

      await tx.user.update({
        where: { id: player.userId },
        data: { name, email: emailStr },
      });

      await tx.playerProfile.update({
        where: { id },
        data: {
          sport,
          status,
          basePrice,
          city,
          phone,
          experienceYears,
          bio,
          photoUrl,
          session,
          cricketRole,
          battingStyle,
          bowlingStyle,
          footballPosition,
          preferredFoot,
          jerseyNumber,
          heightCm,
          weightKg,
        },
      });
    });

    if (status === "ON_AUCTION") {
      publish("auction", {
        type: "ON_BLOCK",
        playerId: id,
        name: name,
        sport: sport,
        photoUrl: photoUrl,
        basePrice: Number(basePrice),
        role: sport === "CRICKET" ? cricketRole : footballPosition,
        session: session,
        experienceYears: experienceYears,
      });
    }

    revalidatePath("/admin/players");
    revalidatePath("/players");
    revalidatePath(`/players/${id}`);
    revalidatePath("/admin/auction");
    revalidatePath("/auction");

    return { ok: true, message: `Successfully updated ${name}'s player profile!` };
  });
}

export async function clearAllPlayersAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await adminGuard();

    const count = await prisma.playerProfile.count();
    if (count === 0) throw new Error("There are no player profiles to delete.");

    await prisma.$transaction([
      prisma.match.updateMany({ data: { motmId: null } }),
      prisma.team.updateMany({ data: { spent: 0 } }),
      prisma.auctionLog.deleteMany({}),
      prisma.cricketEvent.deleteMany({}),
      prisma.footballEvent.deleteMany({}),
      prisma.playerProfile.deleteMany({}),
    ]);

    publish("auction", { type: "CLEAR" });

    revalidatePath("/admin/players");
    revalidatePath("/players");
    revalidatePath("/admin/auction");
    revalidatePath("/auction");
    revalidatePath("/teams");
    revalidatePath("/standings");

    return { ok: true, message: `Successfully deleted all ${count} player profiles from database!` };
  });
}
