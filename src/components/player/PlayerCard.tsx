import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "./StatusBadge";
import { formatMoney, tierFromBasePrice } from "@/lib/validators";
import type { PlayerProfile, User, Team } from "@prisma/client";

type Full = PlayerProfile & { user: Pick<User, "name">; team?: Pick<Team, "name"> | null };

export function PlayerCard({ p, href, showStatus = false }: { p: Full; href?: string; showStatus?: boolean }) {
  const role = p.sport === "CRICKET" ? p.cricketRole : p.footballPosition;
  const tier = p.basePrice > 0 ? tierFromBasePrice(p.basePrice) : null;
  const tierColor = tier === "A" ? "from-gold-400 to-gold-600" : tier === "B" ? "from-brand-400 to-brand-600" : "from-slate-400 to-slate-600";

  const inner = (
    <div className="card card-hover group h-full overflow-hidden">
      {/* Tier corner ribbon */}
      {tier && (
        <div className={`absolute -top-1 -right-1 w-12 h-12 flex items-center justify-center font-display text-lg rounded-bl-2xl text-pitch-dark bg-gradient-to-br ${tierColor}`}>
          {tier}
        </div>
      )}
      {/* Sport icon backdrop */}
      <span className="pointer-events-none absolute -bottom-4 -left-4 text-7xl opacity-[0.06] select-none">
        {p.sport === "CRICKET" ? "🏏" : "⚽"}
      </span>

      <div className="flex items-start gap-4 relative">
        <div className="relative shrink-0">
          <Avatar name={p.user.name} src={p.photoUrl} size={68} />
          {p.sport && (
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full ring-2 ring-pitch-dark flex items-center justify-center text-xs"
              style={{ backgroundColor: p.sport === "CRICKET" ? "#1aae72" : "#f5c542" }}>
              {p.sport === "CRICKET" ? "🏏" : "⚽"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg truncate group-hover:text-brand-300 transition">{p.user.name}</p>
          <p className="text-xs text-slate-400 truncate">
            {role ?? "—"} · {p.city ?? "—"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.basePrice > 0 && <Badge tone="gold">{formatMoney(p.basePrice)}</Badge>}
            {showStatus && <StatusBadge status={p.status as any} />}
            {p.team && <Badge tone="brand">{p.team.name}</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}
