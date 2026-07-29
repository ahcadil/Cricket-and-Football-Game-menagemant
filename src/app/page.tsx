import Link from "next/link";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/ui/Avatar";
import { formatM, tierFromBasePrice } from "@/lib/validators";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [playerCount, teamCount, liveMatch, upcoming, topSold, recentSales, teams] = await Promise.all([
    prisma.playerProfile.count({ where: { status: { in: ["APPROVED", "SOLD", "ON_AUCTION"] } } }),
    prisma.team.count(),
    prisma.match.findFirst({ where: { status: "LIVE" }, include: { teamA: true, teamB: true } }),
    prisma.match.findMany({
      where: { status: "UPCOMING" }, orderBy: { scheduledAt: "asc" }, take: 3,
      include: { teamA: true, teamB: true },
    }),
    prisma.playerProfile.findMany({
      where: { status: "SOLD" }, orderBy: { soldPrice: "desc" }, take: 4,
      include: { user: { select: { name: true } }, team: true },
    }),
    prisma.auctionLog.findMany({
      take: 8, orderBy: { soldAt: "desc" },
      include: { player: { include: { user: { select: { name: true } } } }, team: true },
    }),
    prisma.team.findMany({
      take: 6, orderBy: { createdAt: "desc" },
      include: { _count: { select: { players: true } } },
    }),
  ]);

  return (
    <div className="space-y-10 sm:space-y-16">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 bg-gradient-to-br from-pitch-light/60 via-pitch-dark to-pitch-dark px-6 py-12 sm:px-12 sm:py-20">
        <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl animate-float" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-gold-500/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 chip ring-brand-400/40 bg-brand-500/10 text-brand-300 mb-5">
            <span className="live-dot" /> ArenaCast · Tournament Hub
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight">
            <span className="heading-gradient">Run your tournament</span>
            <br />
            <span className="text-white">like a <span className="heading-fire">champion.</span></span>
          </h1>
          <p className="mt-5 text-slate-300 text-base sm:text-lg max-w-xl">
            Register players, build teams in a live auction, and broadcast ball-by-ball updates to every fan in the stands — all from one beautiful place.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 sm:gap-3">
            <Link href="/auction" className="btn-gold">🔨 Watch Auction</Link>
            <Link href="/matches" className="btn-primary">📺 Live Matches</Link>
            <Link href="/register" className="btn-ghost">Register as Player</Link>
          </div>
        </div>
      </section>

      {/* LIVE BANNER */}
      {liveMatch && (
        <section className="relative overflow-hidden rounded-2xl ring-2 ring-red-500/40 bg-gradient-to-r from-red-500/15 via-pitch-light/40 to-gold-500/15 p-5 sm:p-6 animate-rise">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <span className="chip ring-red-400/60 bg-red-500/20 text-red-300 animate-pulse">
                <span className="live-dot" /> LIVE
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-slate-400">Now Playing</p>
                <p className="text-lg sm:text-2xl truncate">
                  {liveMatch.teamA.name} <span className="text-slate-500">vs</span> {liveMatch.teamB.name}
                </p>
              </div>
            </div>
            <Link href={`/matches/${liveMatch.id}`} className="btn-gold">Open Live →</Link>
          </div>
        </section>
      )}

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatBox label="Players" value={playerCount} icon="👤" />
        <StatBox label="Teams" value={teamCount} icon="🛡️" />
        <StatBox label="Live Now" value={liveMatch ? 1 : 0} icon="📡" accent={!!liveMatch} />
        <StatBox label="Upcoming" value={upcoming.length} icon="📅" />
      </section>

      {/* TICKER */}
      {recentSales.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-2">
            <span className="chip ring-gold-500/40 bg-gold-500/10 text-gold-400">🔨 AUCTION TICKER</span>
            <Link href="/auction" className="text-xs text-brand-400 hover:underline">Open auction →</Link>
          </div>
          <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/30 py-3">
            <div className="flex gap-8 whitespace-nowrap animate-ticker hover:[animation-play-state:paused]">
              {[...recentSales, ...recentSales].map((s, i) => (
                <span key={i} className="inline-flex items-center gap-2 text-sm">
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-200">{s.player.user.name}</span>
                  <span className="text-slate-500">→</span>
                  <span style={{ color: s.team.primaryColor }} className="font-medium">{s.team.name}</span>
                  <span className="text-gold-400 font-display">{formatM(s.soldPrice)}</span>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TOP SOLD */}
      {topSold.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">Auction Highlights</p>
              <h2 className="text-2xl sm:text-3xl"><span className="heading-fire">Most Expensive</span> Signings</h2>
            </div>
            <Link href="/players?status=SOLD" className="text-sm text-brand-400 hover:underline whitespace-nowrap">See all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {topSold.map((p, i) => (
              <Link key={p.id} href={`/players/${p.id}`} className="group relative">
                <div className="card card-hover overflow-hidden">
                  <div className="absolute -top-1 -left-1 w-12 h-12 rounded-br-2xl flex items-center justify-center font-display text-xl text-pitch-dark"
                    style={{ background: i === 0 ? "linear-gradient(135deg,#f5c542,#e6b228)" : i === 1 ? "linear-gradient(135deg,#cbd5e1,#94a3b8)" : i === 2 ? "linear-gradient(135deg,#fb923c,#c2410c)" : "rgba(255,255,255,0.1)" }}>
                    #{i+1}
                  </div>
                  <div className="flex flex-col items-center text-center pt-4">
                    <div className="relative">
                      <Avatar name={p.user.name} src={p.photoUrl} size={80} />
                      {p.team && (
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full ring-2 ring-pitch-dark"
                          style={{ backgroundColor: p.team.primaryColor }} />
                      )}
                    </div>
                    <p className="mt-3 font-medium truncate w-full group-hover:text-brand-300">{p.user.name}</p>
                    <p className="text-xs text-slate-400">{p.sport === "CRICKET" ? "🏏" : "⚽"} {p.team?.name ?? "—"}</p>
                    <p className="mt-2 text-xl font-display text-gold-400">{p.soldPrice ? formatM(p.soldPrice) : "—"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* TEAMS STRIP */}
      {teams.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="label">Franchise Wall</p>
              <h2 className="text-2xl sm:text-3xl"><span className="heading-gradient">The Teams</span></h2>
            </div>
            <Link href="/teams" className="text-sm text-brand-400 hover:underline whitespace-nowrap">All teams →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {teams.map(t => (
              <Link key={t.id} href={`/teams/${t.id}`} className="group">
                <div className="rounded-xl ring-1 ring-white/10 p-3 sm:p-4 text-center transition hover:ring-white/30 hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(135deg, ${t.primaryColor}22, transparent 70%)` }}>
                  <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-display text-2xl ring-1 ring-white/10 overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${t.primaryColor}, ${t.primaryColor}99)` }}>
                    {t.logoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                      : <span className="text-pitch-dark">{t.name.slice(0,1)}</span>}
                  </div>
                  <p className="mt-2 text-sm truncate group-hover:text-white">{t.name}</p>
                  <p className="text-[10px] text-slate-400">{t._count.players} players</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* UPCOMING */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="label">On the Schedule</p>
            <h2 className="text-2xl sm:text-3xl"><span className="heading-gradient">Upcoming Fixtures</span></h2>
          </div>
          <Link href="/matches" className="text-sm text-brand-400 hover:underline whitespace-nowrap">All →</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-slate-400">📭 No matches scheduled yet.</p>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {upcoming.map(m => (
              <li key={m.id} className="relative card card-hover overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 flex">
                  <div style={{ backgroundColor: m.teamA.primaryColor }} className="flex-1" />
                  <div style={{ backgroundColor: m.teamB.primaryColor }} className="flex-1" />
                </div>
                <p className="text-xs text-slate-400 mt-1">{new Date(m.scheduledAt).toLocaleString()}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="flex-1 truncate text-base sm:text-lg" style={{ color: m.teamA.primaryColor }}>{m.teamA.name}</span>
                  <span className="text-xs text-slate-500 font-display">VS</span>
                  <span className="flex-1 truncate text-base sm:text-lg text-right" style={{ color: m.teamB.primaryColor }}>{m.teamB.name}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>{m.venue ?? "TBD"}</span>
                  <Badge tone="brand">{m.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"}</Badge>
                </div>
                <Link href={`/matches/${m.id}`} className="absolute inset-0" aria-label={`View ${m.teamA.name} vs ${m.teamB.name}`} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatBox({ label, value, icon, accent }: { label: string; value: number; icon: string; accent?: boolean }) {
  return (
    <div className={`card ${accent ? "ring-gold-500/40 shadow-glow-gold" : ""}`}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400">{label}</p>
        <span className="text-lg sm:text-xl opacity-60">{icon}</span>
      </div>
      <p className={`mt-1 sm:mt-2 text-3xl sm:text-5xl font-display ${accent ? "text-gold-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
