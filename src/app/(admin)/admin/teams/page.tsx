import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { TeamCard } from "@/components/team/TeamCard";
import { CreateTeamForm } from "@/components/team/CreateTeamForm";
import { DeleteTeamButton } from "@/components/team/DeleteTeamButton";
import { EditTeamButton } from "@/components/team/EditTeamButton";
import { BulkBudgetForm } from "@/components/team/BulkBudgetForm";
import { formatM, formatMoney } from "@/lib/validators";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const [teams, ownerCandidates, totalBudget, totalSpent] = await Promise.all([
    prisma.team.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        _count: { select: { players: true, matchesA: true, matchesB: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["VIEWER", "TEAM_OWNER"] }, ownedTeam: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.team.aggregate({ _sum: { budget: true } }),
    prisma.team.aggregate({ _sum: { spent: true } }),
  ]);

  const cricketTeams = teams.filter(t => t.sport === "CRICKET");
  const footballTeams = teams.filter(t => t.sport === "FOOTBALL");

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header className="flex items-start sm:items-end justify-between flex-wrap gap-4">
        <div>
          <p className="label">Tournament Management</p>
          <h1 className="text-3xl sm:text-4xl heading-gradient">Teams</h1>
          <p className="text-sm text-slate-400 mt-1">Create franchises, assign owners, and manage the auction budget in Millions/Billions.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <Link href="/admin/auction" className="btn-ghost">🔨 Run Auction</Link>
          <Link href="/teams" className="btn-ghost" target="_blank">Public View ↗</Link>
        </div>
      </header>

      {/* QUICK STATS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Teams" value={teams.length} icon="🛡️" />
        <StatBox label="🏏 Cricket" value={cricketTeams.length} />
        <StatBox label="⚽ Football" value={footballTeams.length} />
        <StatBox label="Pool Budget" value={formatM(totalBudget._sum.budget ?? 0)} icon="💰" small subtitle={formatMoney(totalBudget._sum.budget ?? 0)} />
      </section>

      {/* BULK UNIFORM BUDGET SETTER (1-CLICK) */}
      <BulkBudgetForm teamCount={teams.length} />

      {/* CREATE FORM */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex w-10 h-10 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 items-center justify-center text-pitch-dark font-display text-xl">
            +
          </span>
          <div>
            <h2 className="text-xl">Create New Team</h2>
            <p className="text-xs text-slate-400">Set up a franchise, pick a colour, set auction budget in Millions.</p>
          </div>
        </div>
        <CreateTeamForm ownerCandidates={ownerCandidates} />
      </Card>

      {/* EXISTING TEAMS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">All Teams <span className="text-slate-500 text-base">({teams.length})</span></h2>
          {teams.length > 0 && (
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-200">
                <span className="text-brand-300">{formatM(totalSpent._sum.spent ?? 0)}</span> spent of <span className="text-gold-400">{formatM(totalBudget._sum.budget ?? 0)}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {formatMoney(totalSpent._sum.spent ?? 0)} total budget pool
              </p>
            </div>
          )}
        </div>

        {teams.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-5xl opacity-40">🛡️</div>
            <p className="mt-3 text-slate-400">No teams yet — create your first one above.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(t => {
              const matchCount = t._count.matchesA + t._count.matchesB;
              return (
                <div key={t.id} className="flex flex-col gap-2">
                  <TeamCard team={t} />
                  <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                    <div className="min-w-0">
                      <p className="truncate"><span className="text-slate-500">Owner:</span> {t.owner.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{t.owner.email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span title={`${matchCount} match${matchCount === 1 ? "" : "es"}`} className="text-slate-500">{matchCount} ⚔</span>
                      <EditTeamButton team={t} />
                      <DeleteTeamButton
                        teamId={t.id}
                        teamName={t.name}
                        playerCount={t._count.players}
                        matchCount={matchCount}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatBox({ label, value, icon, small, subtitle }: { label: string; value: number | string; icon?: string; small?: boolean; subtitle?: string }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400">{label}</p>
        {icon && <span className="text-base sm:text-lg opacity-60">{icon}</span>}
      </div>
      <p className={`mt-1 sm:mt-2 font-display ${small ? "text-xl sm:text-2xl text-gold-400" : "text-3xl sm:text-4xl text-white"}`}>{value}</p>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
