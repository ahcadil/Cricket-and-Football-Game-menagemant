import Link from "next/link";
import { logoutAction } from "@/server/actions/auth";
import { MobileNav } from "./MobileNav";
import { NavLink } from "./NavLink";

interface Props {
  user: { name: string; role: "ADMIN" | "PLAYER" | "TEAM_OWNER" | "VIEWER" } | null;
}

export function Navbar({ user }: Props) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-pitch-dark/70 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <span className="relative inline-flex w-9 h-9 rounded-lg bg-gradient-to-br from-brand-300 via-brand-500 to-gold-500 items-center justify-center shrink-0 shadow-glow-brand">
            <span className="absolute inset-0.5 rounded-md bg-pitch-dark/40" />
            <span className="relative font-display text-base text-white">A</span>
          </span>
          <span className="font-display text-xl sm:text-2xl tracking-wider truncate heading-gradient">
            ArenaCast
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 text-sm">
          <NavLink href="/players">Players</NavLink>
          <NavLink href="/teams">Teams</NavLink>
          <NavLink href="/matches">Matches</NavLink>
          <NavLink href="/auction">Auction</NavLink>
          <NavLink href="/standings">Standings</NavLink>
          {user?.role === "ADMIN" && <NavLink href="/admin">Admin</NavLink>}
          {user?.role === "PLAYER" && <NavLink href="/dashboard">Dashboard</NavLink>}
          {user?.role === "TEAM_OWNER" && <NavLink href="/my-team">My Team</NavLink>}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden lg:inline text-xs text-slate-300 max-w-[120px] truncate">{user.name}</span>
              <span className="chip ring-brand-500/40 bg-brand-500/10 text-brand-300">{user.role}</span>
              <form action={logoutAction}>
                <button type="submit" className="btn-ghost text-xs px-3 py-1.5 min-h-0">Logout</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-xs px-3 py-1.5 min-h-0">Login</Link>
              <Link href="/register" className="btn-primary text-xs px-3 py-1.5 min-h-0">Join</Link>
            </>
          )}
        </div>

        <MobileNav user={user} />
      </div>
    </header>
  );
}
