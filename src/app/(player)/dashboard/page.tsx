import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/player/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, tierFromBasePrice } from "@/lib/validators";

export const dynamic = "force-dynamic";

export default async function PlayerDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "TEAM_OWNER") redirect("/my-team");

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    include: { team: true },
  });

  if (!profile) {
    return (
      <Card>
        <p className="text-slate-300">No player profile yet. <Link href="/profile" className="text-brand-400">Create one →</Link></p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
            <Avatar name={user.name} src={profile.photoUrl} size={64} className="sm:!w-[72px] sm:!h-[72px] shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl truncate">{user.name}</h1>
              <p className="text-sm text-slate-400 truncate">{profile.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"} · {profile.city ?? "—"}</p>
              <div className="mt-2 flex gap-2 flex-wrap">
                <StatusBadge status={profile.status as any} />
                {profile.basePrice > 0 && <Badge tone="gold">Tier {tierFromBasePrice(profile.basePrice)}</Badge>}
                {profile.basePrice > 0 && <Badge tone="neutral">Base {formatMoney(profile.basePrice)}</Badge>}
              </div>
            </div>
          </div>
          <Link href="/profile" className="btn-ghost w-full sm:w-auto">Edit Profile</Link>
        </div>
      </Card>

      {profile.team && (
        <Card>
          <p className="text-xs uppercase tracking-wider text-slate-400">Drafted by</p>
          <p className="text-2xl mt-1">{profile.team.name}</p>
          {profile.soldPrice && <p className="mt-1 text-gold-400">Sold for {formatMoney(profile.soldPrice)}</p>}
          <Link href={`/teams/${profile.team.id}`} className="mt-2 inline-block text-brand-400 text-sm">View team →</Link>
        </Card>
      )}

      <Card>
        <h2 className="text-xl mb-3">What's next?</h2>
        <ol className="space-y-2 text-sm text-slate-300 list-decimal pl-5">
          <li className={profile.status !== "DRAFT" ? "line-through text-slate-500" : ""}>
            Fill out your profile and submit for approval.
          </li>
          <li className={["APPROVED", "ON_AUCTION", "SOLD"].includes(profile.status) ? "line-through text-slate-500" : ""}>
            Wait for the organizer to approve your registration.
          </li>
          <li className={["SOLD"].includes(profile.status) ? "line-through text-slate-500" : ""}>
            Get drafted into a team during the live auction.
          </li>
          <li>Play matches and climb the standings.</li>
        </ol>
      </Card>
    </div>
  );
}
