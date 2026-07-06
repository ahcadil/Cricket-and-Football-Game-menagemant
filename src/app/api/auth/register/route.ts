import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";
import { email, str, enumVal } from "@/lib/validators";

const ALLOWED_ROLES = ["PLAYER", "TEAM_OWNER", "VIEWER"] as const;

export async function POST(req: Request) {
  const form = await req.formData();
  try {
    const e = email(form.get("email"));
    const password = str(form.get("password"), { required: true, min: 6, max: 100 });
    const name = str(form.get("name"), { required: true, min: 2, max: 80 });
    const role = enumVal(form.get("role"), ALLOWED_ROLES, true)!;

    const existing = await prisma.user.findUnique({ where: { email: e } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email: e, passwordHash, name, role },
    });

    if (role === "PLAYER") {
      // create a draft profile so the player can edit
      await prisma.playerProfile.create({
        data: { userId: user.id, sport: "CRICKET", status: "DRAFT" },
      });
    }

    const token = await signSession({ uid: user.id, role: user.role as any, email: user.email, name: user.name });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, role: user.role as any });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
