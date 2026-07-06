import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProfileForm } from "@/components/player/ProfileForm";
import { StatusBadge } from "@/components/player/StatusBadge";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  let profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } });
  if (!profile && user.role === "PLAYER") {
    profile = await prisma.playerProfile.create({
      data: { userId: user.id, sport: "CRICKET", status: "DRAFT" },
    });
  }
  if (!profile) {
    return (
      <Card>
        <p className="text-slate-300">Only player accounts have profiles. You can sign up as a player to register.</p>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Your Profile</h1>
        <StatusBadge status={profile.status as any} />
      </div>
      {profile.status === "REJECTED" && profile.rejectionNote && (
        <div className="card p-4 ring-red-500/30">
          <p className="text-xs uppercase tracking-wider text-red-300">Reason for Rejection</p>
          <p className="mt-1 text-slate-200">{profile.rejectionNote}</p>
        </div>
      )}
      <Card>
        <ProfileForm profile={profile} />
      </Card>
    </div>
  );
}
