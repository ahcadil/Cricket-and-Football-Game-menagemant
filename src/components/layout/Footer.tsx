import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-gradient-to-b from-transparent to-black/40">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex w-8 h-8 rounded-md bg-gradient-to-br from-brand-300 via-brand-500 to-gold-500 items-center justify-center font-display text-white">A</span>
              <span className="font-display text-xl heading-gradient">ArenaCast</span>
            </div>
            <p className="text-sm text-slate-400">Tournament management for the rest of us — cricket and football, end to end.</p>
          </div>

          <FooterCol title="Explore" links={[
            { href: "/players", label: "Players" },
            { href: "/teams", label: "Teams" },
            { href: "/matches", label: "Matches" },
            { href: "/standings", label: "Standings" },
          ]} />
          <FooterCol title="Live" links={[
            { href: "/auction", label: "Live Auction" },
            { href: "/matches", label: "Live Scores" },
          ]} />
          <FooterCol title="Account" links={[
            { href: "/login", label: "Login" },
            { href: "/register", label: "Register" },
          ]} />
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ArenaCast — all matches reserved.</p>
          <p className="font-display tracking-[0.4em] text-slate-600">RUN · SCORE · WIN</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="label">{title}</p>
      <ul className="space-y-1.5 mt-2">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-slate-300 hover:text-brand-300 transition">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
