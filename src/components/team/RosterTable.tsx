import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatM } from "@/lib/validators";
import type { PlayerProfile, User } from "@prisma/client";

type Row = PlayerProfile & { user: Pick<User, "name"> };

export function RosterTable({ players, sport }: { players: Row[]; sport: string }) {
  if (players.length === 0) {
    return <p className="text-sm text-slate-400">No players drafted yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-400 text-xs uppercase">
          <tr>
            <th className="text-left py-2">Player</th>
            <th className="text-left py-2">{sport === "CRICKET" ? "Role" : "Position"}</th>
            <th className="text-left py-2 hidden md:table-cell">City</th>
            <th className="text-right py-2">Sold</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {players.map(p => (
            <tr key={p.id}>
              <td className="py-3">
                <Link href={`/players/${p.id}`} className="flex items-center gap-3 hover:text-brand-300">
                  <Avatar name={p.user.name} src={p.photoUrl} size={32} />
                  <span>{p.user.name}</span>
                </Link>
              </td>
              <td className="py-3"><Badge tone="slate">{sport === "CRICKET" ? p.cricketRole ?? "—" : p.footballPosition ?? "—"}</Badge></td>
              <td className="py-3 hidden md:table-cell text-slate-400">{p.city ?? "—"}</td>
              <td className="py-3 text-right text-gold-400">{p.soldPrice ? formatM(p.soldPrice) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
