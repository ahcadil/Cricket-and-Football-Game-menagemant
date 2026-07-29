"use server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { str, optStr, int, enumVal, date } from "@/lib/validators";

const SPORTS = ["CRICKET", "FOOTBALL"] as const;
const CRICKET_ROLES = ["BAT", "BOWL", "AR", "WK"] as const;
const FOOTBALL_POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
const FEET = ["LEFT", "RIGHT", "BOTH"] as const;

export async function saveProfileAction(formData: FormData) {
  const sess = await getSession();
  if (!sess) throw new Error("unauthorized");

  const submit = formData.get("submit") === "1";

  const sport = enumVal(formData.get("sport"), SPORTS, true)!;
  const data: Record<string, unknown> = {
    sport,
    city: optStr(formData.get("city")),
    phone: optStr(formData.get("phone")),
    session: optStr(formData.get("session")) || "24-25",
    dob: date(formData.get("dob")),
    experienceYears: int(formData.get("experienceYears")) ?? 0,
    heightCm: int(formData.get("heightCm"), { min: 100, max: 250 }),
    weightKg: int(formData.get("weightKg"), { min: 30, max: 200 }),
    bio: optStr(formData.get("bio")),
    photoUrl: optStr(formData.get("photoUrl")),
  };

  if (sport === "CRICKET") {
    data.battingStyle = optStr(formData.get("battingStyle"));
    data.bowlingStyle = optStr(formData.get("bowlingStyle"));
    data.cricketRole = enumVal(formData.get("cricketRole"), CRICKET_ROLES, false);
    data.preferredFoot = null;
    data.footballPosition = null;
    data.jerseyNumber = null;
  } else {
    data.preferredFoot = enumVal(formData.get("preferredFoot"), FEET, false);
    data.footballPosition = enumVal(formData.get("footballPosition"), FOOTBALL_POSITIONS, false);
    data.jerseyNumber = int(formData.get("jerseyNumber"), { min: 1, max: 99 });
    data.battingStyle = null;
    data.bowlingStyle = null;
    data.cricketRole = null;
  }

  if (submit) data.status = "SUBMITTED";

  const existing = await prisma.playerProfile.findUnique({ where: { userId: sess.uid } });
  if (existing) {
    await prisma.playerProfile.update({ where: { userId: sess.uid }, data });
  } else {
    await prisma.playerProfile.create({ data: { userId: sess.uid, ...data, status: submit ? "SUBMITTED" : "DRAFT" } as never });
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/players");
  redirect("/dashboard");
}
