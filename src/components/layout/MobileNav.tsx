"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions/auth";

interface Props {
  user: { name: string; role: "ADMIN" | "PLAYER" | "TEAM_OWNER" | "VIEWER" } | null;
}

export function MobileNav({ user }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock scroll when drawer open
  useEffect(() => {
    if (open) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = orig; };
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-slate-200 rounded-lg hover:bg-white/5"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>
          ) : (
            <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>
          )}
        </svg>
      </button>

      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="md:hidden fixed inset-x-0 top-16 z-50 bg-pitch-dark border-b border-white/10 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto"
            role="navigation"
          >
            <div className="px-4 py-4 space-y-1">
              <MobileLink href="/players">🏏 Players</MobileLink>
              <MobileLink href="/teams">👥 Teams</MobileLink>
              <MobileLink href="/matches">📺 Matches</MobileLink>
              <MobileLink href="/auction">🔨 Auction</MobileLink>
              <MobileLink href="/standings">📊 Standings</MobileLink>

              {user?.role === "ADMIN" && (
                <>
                  <Divider />
                  <MobileLink href="/admin">⚙️ Admin Console</MobileLink>
                  <MobileLink href="/admin/players">Review Players</MobileLink>
                  <MobileLink href="/admin/teams">Manage Teams</MobileLink>
                  <MobileLink href="/admin/auction">Run Auction</MobileLink>
                  <MobileLink href="/admin/matches">Schedule Matches</MobileLink>
                </>
              )}
              {user?.role === "PLAYER" && (
                <>
                  <Divider />
                  <MobileLink href="/dashboard">My Dashboard</MobileLink>
                  <MobileLink href="/profile">Edit Profile</MobileLink>
                </>
              )}
              {user?.role === "TEAM_OWNER" && (
                <>
                  <Divider />
                  <MobileLink href="/my-team">My Team</MobileLink>
                </>
              )}

              <Divider />
              {user ? (
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{user.name}</p>
                    <p className="text-xs text-brand-300">{user.role}</p>
                  </div>
                  <form action={logoutAction}>
                    <button type="submit" className="btn-ghost text-xs">Logout</button>
                  </form>
                </div>
              ) : (
                <div className="px-4 py-3 grid grid-cols-2 gap-2">
                  <Link href="/login" className="btn-ghost text-center">Login</Link>
                  <Link href="/register" className="btn-primary text-center">Join</Link>
                </div>
              )}
            </div>
          </nav>
        </>
      )}
    </>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-3 text-slate-200 hover:bg-white/5 rounded-lg active:bg-white/10 text-base"
    >
      {children}
    </Link>
  );
}

function Divider() {
  return <div className="my-2 border-t border-white/5" />;
}
