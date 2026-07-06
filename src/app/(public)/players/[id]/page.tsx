import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/player/StatusBadge";
import { formatMoney, tierFromBasePrice } from "@/lib/validators";

export const dynamic = "force-dynamic";

export default async function PlayerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.playerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      team: true,
      motmFor: { include: { teamA: true, teamB: true } },
    },
  });
  if (!p) notFound();

  const role = p.sport === "CRICKET" ? p.cricketRole : p.footballPosition;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <div className="flex items-start gap-4 sm:gap-6 flex-wrap">
          <Avatar name={p.user.name} src={p.photoUrl} size={88} className="sm:!w-[120px] sm:!h-[120px]" />
          <div className="flex-1 min-w-[180px]">
            <h1 className="text-2xl sm:text-4xl break-words">{p.user.name}</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">
              {p.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"} · {role ?? "—"} · {p.city ?? "—"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={p.status as any} />
              {p.basePrice > 0 && <Badge tone="gold">Tier {tierFromBasePrice(p.basePrice)} · {formatMoney(p.basePrice)}</Badge>}
              {p.team && <Link href={`/teams/${p.team.id}`}><Badge tone="brand">{p.team.name}</Badge></Link>}
              {p.soldPrice && <Badge tone="neutral">Sold {formatMoney(p.soldPrice)}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-xl mb-3">Vitals</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-400">Experience</dt><dd>{p.experienceYears}y</dd>
            <dt className="text-slate-400">Height</dt><dd>{p.heightCm ? `${p.heightCm} cm` : "—"}</dd>
            <dt className="text-slate-400">Weight</dt><dd>{p.weightKg ? `${p.weightKg} kg` : "—"}</dd>
            <dt className="text-slate-400">Date of Birth</dt><dd>{p.dob ? new Date(p.dob).toLocaleDateString() : "—"}</dd>
          </dl>
        </Card>
        <Card>
          <h2 className="text-xl mb-3">Sport Profile</h2>
          {p.sport === "CRICKET" ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-400">Role</dt><dd>{p.cricketRole ?? "—"}</dd>
              <dt className="text-slate-400">Batting</dt><dd>{p.battingStyle ?? "—"}</dd>
              <dt className="text-slate-400">Bowling</dt><dd>{p.bowlingStyle ?? "—"}</dd>
            </dl>
          ) : (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-400">Position</dt><dd>{p.footballPosition ?? "—"}</dd>
              <dt className="text-slate-400">Preferred Foot</dt><dd>{p.preferredFoot ?? "—"}</dd>
              <dt className="text-slate-400">Jersey #</dt><dd>{p.jerseyNumber ?? "—"}</dd>
            </dl>
          )}
        </Card>
      </div>

      {p.bio && (
        <Card>
          <h2 className="text-xl mb-2">Bio</h2>
          <p className="text-slate-300 whitespace-pre-wrap">{p.bio}</p>
        </Card>
      )}

      {p.motmFor.length > 0 && (
        <Card>
          <h2 className="text-xl mb-3">Man of the Match Honours ({p.motmFor.length})</h2>
          <ul className="text-sm space-y-1">
            {p.motmFor.map(m => (
              <li key={m.id}>· <Link href={`/matches/${m.id}`} className="text-brand-300 hover:underline">{m.teamA.name} vs {m.teamB.name}</Link></li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
