import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createMatchAction, deleteMatchAction } from "@/server/actions/match";
import { MatchCard } from "@/components/match/MatchCard";

export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  const [teams, matches] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.match.findMany({
      include: { teamA: true, teamB: true, winner: true },
      orderBy: { scheduledAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Matches</h1>

      <Card>
        <h2 className="text-xl mb-4">Schedule New Match</h2>
        <form action={createMatchAction} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Sport">
              <Select name="sport" required defaultValue="CRICKET">
                <option value="CRICKET">Cricket</option>
                <option value="FOOTBALL">Football</option>
              </Select>
            </Field>
            <Field label="Scheduled At">
              <Input type="datetime-local" name="scheduledAt" required />
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Team A">
              <Select name="teamAId" required defaultValue="">
                <option value="" disabled>— select —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.sport})</option>)}
              </Select>
            </Field>
            <Field label="Team B">
              <Select name="teamBId" required defaultValue="">
                <option value="" disabled>— select —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.sport})</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Venue (optional)"><Input name="venue" placeholder="Wankhede" /></Field>
            <Field label="Overs per side (cricket)">
              <Input type="number" name="oversPerSide" min={1} max={50} defaultValue={20} />
            </Field>
          </div>
          <button className="btn-primary">Schedule</button>
        </form>
      </Card>

      <section>
        <h2 className="text-xl mb-3">All Matches</h2>
        {matches.length === 0 ? (
          <p className="text-slate-400 text-sm">No matches yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map(m => (
              <div key={m.id} className="space-y-2">
                <MatchCard m={m} />
                <div className="flex justify-between text-xs px-1">
                  <Link href={`/admin/matches/${m.id}/score`} className="text-brand-400 hover:underline">
                    {m.status === "FINISHED" ? "View" : "Score / Manage"} →
                  </Link>
                  <form action={deleteMatchAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="text-red-400 hover:text-red-300">Delete</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
