"use server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { publish } from "@/lib/sse";
import { revalidatePath } from "next/cache";
import { str, optStr, int, enumVal, date } from "@/lib/validators";

const SPORTS = ["CRICKET", "FOOTBALL"] as const;
const TOSS = ["BAT", "BOWL"] as const;

async function adminGuard() {
  const sess = await getSession();
  if (!sess || sess.role !== "ADMIN") throw new Error("unauthorized");
  return sess;
}

export async function createMatchAction(formData: FormData) {
  await adminGuard();
  const sport = enumVal(formData.get("sport"), SPORTS, true)!;
  const teamAId = str(formData.get("teamAId"), { required: true });
  const teamBId = str(formData.get("teamBId"), { required: true });
  if (teamAId === teamBId) throw new Error("Teams must differ");
  const scheduledAt = date(formData.get("scheduledAt"), true)!;
  const venue = optStr(formData.get("venue"));
  const oversPerSide = sport === "CRICKET" ? (int(formData.get("oversPerSide"), { min: 1, max: 50 }) ?? 20) : null;

  const [a, b] = await Promise.all([
    prisma.team.findUnique({ where: { id: teamAId } }),
    prisma.team.findUnique({ where: { id: teamBId } }),
  ]);
  if (!a || !b) throw new Error("Team not found");
  if (a.sport !== sport || b.sport !== sport) throw new Error("Team sport mismatch");

  await prisma.match.create({
    data: { sport, teamAId, teamBId, scheduledAt, venue, oversPerSide },
  });

  revalidatePath("/admin/matches");
  revalidatePath("/matches");
}

export async function startMatchAction(formData: FormData) {
  await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const tossWinnerId = optStr(formData.get("tossWinnerId"));
  const tossDecision = enumVal(formData.get("tossDecision"), TOSS, false);

  const match = await prisma.match.update({
    where: { id },
    data: { status: "LIVE", tossWinnerId, tossDecision },
    include: { teamA: true, teamB: true },
  });

  if (match.sport === "CRICKET") {
    const existing = await prisma.cricketInnings.count({ where: { matchId: id } });
    if (existing === 0) {
      let battingTeamId = match.teamAId;
      if (tossWinnerId && tossDecision === "BAT") battingTeamId = tossWinnerId;
      else if (tossWinnerId && tossDecision === "BOWL") battingTeamId = tossWinnerId === match.teamAId ? match.teamBId : match.teamAId;
      await prisma.cricketInnings.create({
        data: { matchId: id, battingTeamId, order: 1 },
      });
    }
  }

  publish(`match:${id}`, { type: "STATUS", status: "LIVE" });
  revalidatePath(`/admin/matches/${id}/score`);
  revalidatePath(`/matches/${id}`);
}

export async function endMatchAction(formData: FormData) {
  await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const winnerId = optStr(formData.get("winnerId"));
  const motmId = optStr(formData.get("motmId"));

  await prisma.match.update({
    where: { id },
    data: { status: "FINISHED", winnerId, motmId },
  });

  publish(`match:${id}`, { type: "STATUS", status: "FINISHED", winnerId, motmId });
  revalidatePath(`/admin/matches`);
  revalidatePath(`/matches`);
  revalidatePath(`/matches/${id}`);
  revalidatePath(`/standings`);
}

export async function deleteMatchAction(formData: FormData) {
  await adminGuard();
  const id = str(formData.get("id"), { required: true });
  await prisma.match.delete({ where: { id } });
  revalidatePath("/admin/matches");
  revalidatePath("/matches");
}
