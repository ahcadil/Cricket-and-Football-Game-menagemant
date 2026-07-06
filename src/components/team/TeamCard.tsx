import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/validators";

interface Props {
  team: {
    id: string; name: string; sport: string;
    primaryColor: string; tagline?: string | null; budget: number; spent: number;
    logoUrl?: string | null;
    _count?: { players: number };
  };
}

export function TeamCard({ team }: Props) {
  const remaining = team.budget - team.spent;
  const pct = team.budget > 0 ? Math.min(100, Math.round((team.spent / team.budget) * 100)) : 0;
  return (
    <Link
      href={`/teams/${team.id}`}
      className="relative block overflow-hidden rounded-2xl ring-1 ring-white/10 hover:ring-white/30 hover:-translate-y-0.5 transition group h-full"
      style={{
        background: `linear-gradient(135deg, ${team.primaryColor}33 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 100%)`,
      }}
    >
      {/* Color block */}
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: team.primaryColor }} />
      {/* Watermark */}
      <span className="pointer-events-none absolute -bottom-6 -right-6 text-9xl opacity-[0.05] select-none" style={{ color: team.primaryColor }}>
        {team.sport === "CRICKET" ? "🏏" : "⚽"}
      </span>

      <div className="p-5">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-2xl ring-1 ring-white/10 overflow-hidden shrink-0"
            style={{ background: `linear-gradient(135deg, ${team.primaryColor}, ${team.primaryColor}aa)` }}
          >
            {team.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
              : <span className="text-pitch-dark">{team.name.slice(0,1)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg truncate group-hover:text-white transition">{team.name}</p>
            <p className="text-xs text-slate-400">
              {team.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"}
              {team._count ? ` · ${team._count.players} player${team._count.players === 1 ? "" : "s"}` : ""}
            </p>
          </div>
        </div>

        {team.tagline && (
          <p className="mt-3 text-sm text-slate-300/80 italic truncate">"{team.tagline}"</p>
        )}

        <div className="mt-4">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400 mb-1">
            <span>Spent</span>
            <span>Budget</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: team.primaryColor }} />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-slate-300">{formatMoney(team.spent)}</span>
            <span className="text-brand-300">{formatMoney(remaining)} left</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
