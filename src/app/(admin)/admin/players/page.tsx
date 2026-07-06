import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/player/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { approvePlayerAction, rejectPlayerAction, setBasePriceAction } from "@/server/actions/adminPlayer";
import { formatMoney } from "@/lib/validators";
import { BulkPlayerImport } from "@/components/player/BulkPlayerImport";
import type { PlayerProfile, User } from "@prisma/client";

export const dynamic = "force-dynamic";

type Row = PlayerProfile & { user: Pick<User, "name" | "email"> };

export default async function AdminPlayersPage() {
  const submitted = await prisma.playerProfile.findMany({
    where: { status: "SUBMITTED" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { updatedAt: "asc" },
  });
  const approved = await prisma.playerProfile.findMany({
    where: { status: { in: ["APPROVED", "ON_AUCTION", "UNSOLD"] } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const rejected = await prisma.playerProfile.findMany({
    where: { status: "REJECTED" },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl">Player Submissions</h1>
        <BulkPlayerImport />
      </div>
      <Tabs items={[
        { label: `Pending (${submitted.length})`, content: <PendingList rows={submitted} /> },
        { label: `Approved (${approved.length})`, content: <ApprovedList rows={approved} /> },
        { label: `Rejected (${rejected.length})`, content: <RejectedList rows={rejected} /> },
      ]} />
    </div>
  );
}

function PendingList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="text-slate-400 text-sm">No submissions waiting.</p>;
  return (
    <div className="space-y-3">
      {rows.map(p => (
        <Card key={p.id}>
          <div className="flex items-start gap-4">
            <Avatar name={p.user.name} src={p.photoUrl} size={56} />
            <div className="flex-1 min-w-0">
              <p className="text-lg">{p.user.name} <span className="text-slate-500 text-sm">· {p.user.email}</span></p>
              <p className="text-xs text-slate-400 mt-0.5">
                {p.sport === "CRICKET" ? "🏏" : "⚽"} {p.sport === "CRICKET" ? p.cricketRole ?? "—" : p.footballPosition ?? "—"}
                {" · "}{p.city ?? "—"}{" · "}{p.experienceYears}y exp
              </p>
              {p.bio && <p className="mt-2 text-sm text-slate-300 line-clamp-2">{p.bio}</p>}
            </div>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <form action={approvePlayerAction} className="flex gap-2 items-stretch">
              <input type="hidden" name="id" value={p.id} />
              <input name="basePrice" type="number" min={0} step={50000} defaultValue={100000}
                className="input flex-1 min-w-0" placeholder="Base price ₹" />
              <button className="btn-primary shrink-0">Approve</button>
            </form>
            <form action={rejectPlayerAction} className="flex gap-2 items-stretch">
              <input type="hidden" name="id" value={p.id} />
              <input name="note" required maxLength={300} className="input flex-1 min-w-0" placeholder="Reason for rejection" />
              <button className="btn-danger shrink-0">Reject</button>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ApprovedList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="text-slate-400 text-sm">Nothing approved yet.</p>;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {rows.map(p => (
        <Card key={p.id}>
          <div className="flex items-center gap-3">
            <Avatar name={p.user.name} src={p.photoUrl} size={44} />
            <div className="flex-1">
              <p className="font-medium">{p.user.name}</p>
              <div className="flex gap-2 mt-1 text-xs">
                <StatusBadge status={p.status as any} />
                <span className="text-slate-400">Base {formatMoney(p.basePrice)}</span>
              </div>
            </div>
          </div>
          <form action={setBasePriceAction} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={p.id} />
            <input name="basePrice" type="number" min={0} step={50000} defaultValue={p.basePrice} className="input flex-1" />
            <button className="btn-ghost text-xs">Update Base</button>
          </form>
        </Card>
      ))}
    </div>
  );
}

function RejectedList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="text-slate-400 text-sm">No rejected entries.</p>;
  return (
    <ul className="space-y-2">
      {rows.map(p => (
        <li key={p.id} className="card p-4">
          <p>{p.user.name} <span className="text-xs text-slate-500">{p.user.email}</span></p>
          {p.rejectionNote && <p className="mt-1 text-sm text-red-300">"{p.rejectionNote}"</p>}
        </li>
      ))}
    </ul>
  );
}
