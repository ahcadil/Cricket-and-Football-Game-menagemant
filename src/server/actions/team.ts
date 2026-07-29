"use server";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { str, optStr, int, enumVal, email, formatM } from "@/lib/validators";
import { safeAction, type ActionState } from "@/lib/action";
import { convertGoogleDriveUrl } from "@/lib/bulkPlayers";

const SPORTS = ["CRICKET", "FOOTBALL"] as const;

async function adminGuard() {
  const sess = await getSession();
  if (!sess || sess.role !== "ADMIN") throw new Error("Admins only");
  return sess;
}

export async function createTeamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await adminGuard();

    const name = str(formData.get("name"), { required: true, min: 2, max: 60 });
    const sport = enumVal(formData.get("sport"), SPORTS, true)!;
    const budget = int(formData.get("budget"), { required: true, min: 0 })!;
    const primaryColor = optStr(formData.get("primaryColor")) ?? "#1aae72";
    const tagline = optStr(formData.get("tagline"));
    const logoUrl = optStr(formData.get("logoUrl"));

    const nameTaken = await prisma.team.findUnique({ where: { name } });
    if (nameTaken) throw new Error(`Team name "${name}" is already taken`);

    const ownerMode = formData.get("ownerMode");
    let ownerId: string;

    if (ownerMode === "existing") {
      const userIdRaw = formData.get("ownerUserId");
      const userId = typeof userIdRaw === "string" ? userIdRaw.trim() : "";
      if (!userId) throw new Error("Pick an existing user to be the owner");
      const exists = await prisma.user.findUnique({ where: { id: userId } });
      if (!exists) throw new Error("Owner not found");
      const taken = await prisma.team.findUnique({ where: { ownerId: userId } });
      if (taken) throw new Error(`${exists.name} already owns "${taken.name}"`);
      await prisma.user.update({ where: { id: userId }, data: { role: "TEAM_OWNER" } });
      ownerId = userId;
    } else if (ownerMode === "new") {
      // require all three only in this branch
      const nameRaw = formData.get("ownerName");
      const emailRaw = formData.get("ownerEmail");
      const pwRaw = formData.get("ownerPassword");
      if (typeof nameRaw !== "string" || !nameRaw.trim()) throw new Error("Owner name is required");
      if (typeof emailRaw !== "string" || !emailRaw.trim()) throw new Error("Owner email is required");
      if (typeof pwRaw !== "string" || pwRaw.length < 6) throw new Error("Owner password must be at least 6 characters");

      const ownerName = str(nameRaw, { required: true, min: 2, max: 80 });
      const ownerEmail = email(emailRaw);
      const dup = await prisma.user.findUnique({ where: { email: ownerEmail } });
      if (dup) throw new Error(`Email "${ownerEmail}" already registered`);
      const newOwner = await prisma.user.create({
        data: {
          email: ownerEmail, name: ownerName,
          passwordHash: await hashPassword(pwRaw),
          role: "TEAM_OWNER",
        },
      });
      ownerId = newOwner.id;
    } else {
      throw new Error("Choose 'existing user' or 'new account' for the team owner");
    }

    await prisma.team.create({
      data: { name, sport, budget, primaryColor, tagline, logoUrl, ownerId },
    });

    revalidatePath("/admin/teams");
    revalidatePath("/teams");
  });
}

export async function updateTeamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await adminGuard();
    const id = str(formData.get("id"), { required: true });
    const name = str(formData.get("name"), { required: true, min: 2, max: 60 });
    const sport = enumVal(formData.get("sport"), SPORTS, false) ?? "CRICKET";
    const budget = int(formData.get("budget"), { required: true, min: 0 })!;
    const primaryColor = optStr(formData.get("primaryColor")) ?? "#1aae72";
    const tagline = optStr(formData.get("tagline"));
    const rawLogoUrl = optStr(formData.get("logoUrl"));
    const logoUrl = rawLogoUrl ? convertGoogleDriveUrl(rawLogoUrl) : null;

    const ownerName = optStr(formData.get("ownerName"));
    const ownerEmail = optStr(formData.get("ownerEmail"));

    const team = await prisma.team.findUnique({
      where: { id },
      include: { owner: true }
    });
    if (!team) throw new Error("Team not found");

    const numBudget = Number(budget);
    const numSpent = Number(team.spent);
    if (numBudget < numSpent) {
      throw new Error(`Budget can't be less than already-spent $${numSpent.toLocaleString()}`);
    }

    if (name !== team.name) {
      const dup = await prisma.team.findUnique({ where: { name } });
      if (dup) throw new Error(`Team name "${name}" is already taken`);
    }

    // Update team attributes
    await prisma.team.update({
      where: { id },
      data: { name, sport, budget, primaryColor, tagline, logoUrl },
    });

    // Update owner info if provided
    if (team.ownerId && (ownerName || ownerEmail)) {
      const updateData: { name?: string; email?: string } = {};
      if (ownerName && ownerName !== team.owner.name) updateData.name = ownerName;
      if (ownerEmail && ownerEmail !== team.owner.email) {
        const dupEmail = await prisma.user.findUnique({ where: { email: ownerEmail } });
        if (dupEmail && dupEmail.id !== team.ownerId) {
          throw new Error(`Email "${ownerEmail}" is already taken by another user`);
        }
        updateData.email = ownerEmail;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: team.ownerId },
          data: updateData,
        });
      }
    }

    revalidatePath("/admin/teams");
    revalidatePath("/admin/auction");
    revalidatePath("/teams");
    revalidatePath(`/teams/${id}`);
    revalidatePath("/my-team");
  });
}

export async function deleteTeamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await adminGuard();
    const id = str(formData.get("id"), { required: true });
    const team = await prisma.team.findUnique({ where: { id }, include: { _count: { select: { players: true, matchesA: true, matchesB: true } } } });
    if (!team) throw new Error("Team not found");

    const matchCount = team._count.matchesA + team._count.matchesB;
    if (matchCount > 0) {
      throw new Error(`Can't delete — ${team.name} is in ${matchCount} match${matchCount === 1 ? "" : "es"}. Delete those first.`);
    }

    await prisma.$transaction([
      // Release players back to the auction pool
      prisma.playerProfile.updateMany({
        where: { teamId: id },
        data: { teamId: null, status: "APPROVED", soldPrice: null, soldAt: null },
      }),
      // Cascade audit logs explicitly (Prisma schema has no automatic cascade here)
      prisma.auctionLog.deleteMany({ where: { teamId: id } }),
      prisma.team.delete({ where: { id } }),
    ]);

    revalidatePath("/admin/teams");
    revalidatePath("/teams");
  });
}

export async function bulkUpdateBudgetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await adminGuard();
    const budget = int(formData.get("budget"), { required: true, min: 0 })!;

    const invalidTeam = await prisma.team.findFirst({
      where: { spent: { gt: budget } },
      select: { name: true, spent: true },
    });

    if (invalidTeam) {
      throw new Error(`Cannot set budget lower than ${invalidTeam.name}'s spent amount (${formatM(invalidTeam.spent)}).`);
    }

    const result = await prisma.team.updateMany({
      data: { budget },
    });

    revalidatePath("/admin/teams");
    revalidatePath("/teams");
    revalidatePath("/admin/auction");
    revalidatePath("/my-team");

    return { ok: true, message: `Successfully updated budget to all ${result.count} teams!` };
  });
}
