import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";
import { email, str } from "@/lib/validators";

export async function POST(req: Request) {
  const form = await req.formData();
  try {
    const e = email(form.get("email"));
    const password = str(form.get("password"), { required: true });

    const user = await prisma.user.findUnique({ where: { email: e } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const token = await signSession({ uid: user.id, role: user.role as any, email: user.email, name: user.name });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, role: user.role as any });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
