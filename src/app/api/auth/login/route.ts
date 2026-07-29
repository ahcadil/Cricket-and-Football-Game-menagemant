import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";
import { email, str } from "@/lib/validators";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const form = await req.formData();
  try {
    const e = email(form.get("email"));
    const password = str(form.get("password"), { required: true });

    // Throttle brute-force: 5 attempts / minute per IP+email.
    const limit = rateLimit(`login:${clientIp(req)}:${e}`, 5, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${limit.retryAfter}s.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

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
