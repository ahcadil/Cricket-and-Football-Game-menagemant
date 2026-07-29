import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const RAW_SECRET = process.env.JWT_SECRET;
if (!RAW_SECRET || RAW_SECRET.length < 32) {
  throw new Error("JWT_SECRET is missing or too short (need ≥32 chars). Set it in .env.");
}
const SECRET = new TextEncoder().encode(RAW_SECRET);
const COOKIE_NAME = "arenacast_session";

async function readSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { uid: string; role: "ADMIN" | "PLAYER" | "TEAM_OWNER" | "VIEWER" };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // public root, auth pages, public groups & API auth: pass through
  const sess = await readSession(req);

  if (pathname.startsWith("/admin")) {
    if (!sess) return NextResponse.redirect(new URL("/login?next=" + pathname, req.url));
    if (sess.role !== "ADMIN") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname === "/profile" || pathname === "/dashboard") {
    if (!sess) return NextResponse.redirect(new URL("/login?next=" + pathname, req.url));
  }

  if (pathname.startsWith("/my-team")) {
    if (!sess) return NextResponse.redirect(new URL("/login?next=" + pathname, req.url));
    if (sess.role !== "TEAM_OWNER" && sess.role !== "ADMIN")
      return NextResponse.redirect(new URL("/", req.url));
  }

  // Don't let logged-in users see login/register
  if ((pathname === "/login" || pathname === "/register") && sess) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile", "/dashboard", "/my-team/:path*", "/login", "/register"],
};
