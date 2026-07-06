import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [pendingProfiles, approvedProfiles, teams, upcoming, liveMatches, totalSold] = await Promise.all([
    prisma.playerProfile.count({ where: { status: "SUBMITTED" } }),
    prisma.playerProfile.count({ where: { status: "APPROVED" } }),
    prisma.team.count(),
    prisma.match.count({ where: { status: "UPCOMING" } }),
    prisma.match.count({ where: { status: "LIVE" } }),
    prisma.playerProfile.count({ where: { status: "SOLD" } }),
  ]);

  const tiles = [
    { label: "Pending Approval", value: pendingProfiles, href: "/admin/players", accent: pendingProfiles > 0 },
    { label: "Approved (Auction Pool)", value: approvedProfiles, href: "/admin/auction" },
    { label: "Sold Players", value: totalSold, href: "/admin/auction" },
    { label: "Teams", value: teams, href: "/admin/teams" },
    { label: "Live Matches", value: liveMatches, href: "/admin/matches", accent: liveMatches > 0 },
    { label: "Upcoming", value: upcoming, href: "/admin/matches" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl">Admin Console</h1>
        <p className="text-sm text-slate-400">Tournament organizer cockpit</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {tiles.map(t => (
          <Link key={t.label} href={t.href} className={`card p-5 hover:ring-brand-500/40 transition ${t.accent ? "ring-gold-500/40" : ""}`}>
            <p className="text-xs uppercase tracking-wider text-slate-400">{t.label}</p>
            <p className={`mt-2 text-4xl font-display ${t.accent ? "text-gold-400" : "text-white"}`}>{t.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/players" className="btn-primary">Review Player Submissions</Link>
            <Link href="/admin/teams" className="btn-ghost">Manage Teams</Link>
            <Link href="/admin/auction" className="btn-gold">Run Auction</Link>
            <Link href="/admin/matches" className="btn-ghost">Schedule Matches</Link>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl mb-3">Workflow</h2>
          <ol className="text-sm text-slate-300 space-y-1 list-decimal pl-5">
            <li>Players register & submit profiles.</li>
            <li>You approve and set a base price.</li>
            <li>Create teams and assign owners.</li>
            <li>Mark approved players "on auction" and assign to teams.</li>
            <li>Schedule matches and score them live.</li>
          </ol>
        </Card>
      </section>
    </div>
  );
}
