"use server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { publish } from "@/lib/sse";
import { revalidatePath } from "next/cache";
import { str, int, enumVal, optStr } from "@/lib/validators";

const WICKETS = ["BOWLED", "CAUGHT", "LBW", "RUNOUT", "STUMPED", "HITWICKET"] as const;
const EXTRAS = ["WIDE", "NOBALL", "BYE", "LEGBYE"] as const;
const FB_EVENTS = ["GOAL", "OWN_GOAL", "YELLOW", "RED", "SUB_IN", "SUB_OUT", "PENALTY", "MISSED_PEN"] as const;

async function adminGuard() {
  const sess = await getSession();
  if (!sess || sess.role !== "ADMIN") throw new Error("unauthorized");
  return sess;
}

export async function addCricketBallAction(formData: FormData) {
  await adminGuard();
  const matchId = str(formData.get("matchId"), { required: true });
  const runs = int(formData.get("runs"), { required: true, min: 0, max: 7 })!;
  const isWicket = formData.get("isWicket") === "1";
  const wicketType = isWicket ? enumVal(formData.get("wicketType"), WICKETS, false) : null;
  const extraType = enumVal(formData.get("extraType"), EXTRAS, false);
  const batsmanId = optStr(formData.get("batsmanId"));
  const bowlerId = optStr(formData.get("bowlerId"));
  const note = optStr(formData.get("note"));

  const innings = await prisma.cricketInnings.findFirst({
    where: { matchId, closed: false },
    orderBy: { order: "desc" },
  });
  if (!innings) throw new Error("No open innings");

  const legalBall = !extraType || extraType === "BYE" || extraType === "LEGBYE";
  const newBallsBowled = innings.ballsBowled + (legalBall ? 1 : 0);
  const over = Math.floor(innings.ballsBowled / 6);
  const ballInOver = (innings.ballsBowled % 6) + 1;
  const totalRuns = innings.runs + runs + (extraType === "WIDE" || extraType === "NOBALL" ? 1 : 0);

  const event = await prisma.cricketEvent.create({
    data: {
      matchId, inningsId: innings.id,
      over,
      ball: ballInOver,
      batsmanId, bowlerId, runs, isWicket,
      wicketType: wicketType as never, extraType: extraType as never, note,
    },
    include: {
      batsman: { include: { user: { select: { name: true } } } },
      bowler:  { include: { user: { select: { name: true } } } },
    }
  });

  await prisma.cricketInnings.update({
    where: { id: innings.id },
    data: {
      runs: totalRuns,
      wickets: isWicket ? innings.wickets + 1 : innings.wickets,
      ballsBowled: newBallsBowled,
      extras: extraType ? innings.extras + (extraType === "WIDE" || extraType === "NOBALL" ? 1 : 0) : innings.extras,
    },
  });

  publish(`match:${matchId}`, {
    type: "CRICKET_BALL",
    inningsOrder: innings.order,
    runs, isWicket, extraType, wicketType, note,
    batsman: event.batsman?.user.name ?? null,
    bowler: event.bowler?.user.name ?? null,
    over: event.over, ball: event.ball,
    totalRuns, wickets: isWicket ? innings.wickets + 1 : innings.wickets,
    ballsBowled: newBallsBowled,
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/admin/matches/${matchId}/score`);
}

export async function closeInningsAction(formData: FormData) {
  await adminGuard();
  const matchId = str(formData.get("matchId"), { required: true });
  const inningsId = str(formData.get("inningsId"), { required: true });
  await prisma.cricketInnings.update({ where: { id: inningsId }, data: { closed: true } });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;
  const inningsCount = await prisma.cricketInnings.count({ where: { matchId } });
  if (inningsCount === 1) {
    // start 2nd innings, batting team flips
    const first = await prisma.cricketInnings.findFirst({ where: { matchId, order: 1 } });
    if (first) {
      const newBatting = first.battingTeamId === match.teamAId ? match.teamBId : match.teamAId;
      await prisma.cricketInnings.create({
        data: { matchId, battingTeamId: newBatting, order: 2 },
      });
    }
  }
  publish(`match:${matchId}`, { type: "INNINGS_CLOSED" });
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/admin/matches/${matchId}/score`);
}

export async function addFootballEventAction(formData: FormData) {
  await adminGuard();
  const matchId = str(formData.get("matchId"), { required: true });
  const minute = int(formData.get("minute"), { required: true, min: 0, max: 130 })!;
  const teamId = str(formData.get("teamId"), { required: true });
  const playerId = optStr(formData.get("playerId"));
  const type = enumVal(formData.get("type"), FB_EVENTS, true)!;
  const note = optStr(formData.get("note"));

  const ev = await prisma.footballEvent.create({
    data: { matchId, minute, teamId, playerId, type: type as never, note },
    include: { team: true, player: { include: { user: { select: { name: true } } } } },
  });

  publish(`match:${matchId}`, {
    type: "FOOTBALL_EVENT",
    minute, eventType: type, teamId, teamName: ev.team.name, primaryColor: ev.team.primaryColor,
    player: ev.player?.user.name ?? null, note,
  });

  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/admin/matches/${matchId}/score`);
}

export async function deleteCricketEventAction(formData: FormData) {
  await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const event = await prisma.cricketEvent.findUnique({ where: { id } });
  if (!event) return;
  const innings = await prisma.cricketInnings.findUnique({ where: { id: event.inningsId } });
  if (!innings) return;

  const legalBall = !event.extraType || event.extraType === "BYE" || event.extraType === "LEGBYE";
  const runDeduction = event.runs + (event.extraType === "WIDE" || event.extraType === "NOBALL" ? 1 : 0);
  const extraDeduction = event.extraType === "WIDE" || event.extraType === "NOBALL" ? 1 : 0;

  await prisma.cricketInnings.update({
    where: { id: innings.id },
    data: {
      runs: Math.max(0, innings.runs - runDeduction),
      wickets: Math.max(0, innings.wickets - (event.isWicket ? 1 : 0)),
      ballsBowled: Math.max(0, innings.ballsBowled - (legalBall ? 1 : 0)),
      extras: Math.max(0, innings.extras - extraDeduction),
    },
  });
  await prisma.cricketEvent.delete({ where: { id } });
  publish(`match:${event.matchId}`, { type: "REFRESH" });
  revalidatePath(`/matches/${event.matchId}`);
  revalidatePath(`/admin/matches/${event.matchId}/score`);
}

export async function deleteFootballEventAction(formData: FormData) {
  await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const ev = await prisma.footballEvent.findUnique({ where: { id } });
  if (!ev) return;
  await prisma.footballEvent.delete({ where: { id } });
  publish(`match:${ev.matchId}`, { type: "REFRESH" });
  revalidatePath(`/matches/${ev.matchId}`);
  revalidatePath(`/admin/matches/${ev.matchId}/score`);
}
