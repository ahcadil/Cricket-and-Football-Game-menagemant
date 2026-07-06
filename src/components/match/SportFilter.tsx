"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

interface Props { hasTeam: boolean }

export function SportFilter({ hasTeam }: Props) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const sport = sp.get("sport") ?? "";
  const mine = sp.get("mine") === "1";

  function hrefWith(updates: Record<string, string | null>): string {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const pill = "px-3 sm:px-4 py-2 rounded-full text-sm whitespace-nowrap ring-1 transition";
  const off = "ring-white/15 text-slate-300 hover:bg-white/5 hover:text-white";
  const on = "ring-brand-400 bg-brand-500/20 text-brand-200";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={hrefWith({ sport: null })} className={cn(pill, sport === "" ? on : off)}>All sports</Link>
      <Link href={hrefWith({ sport: "CRICKET" })} className={cn(pill, sport === "CRICKET" ? on : off)}>🏏 Cricket</Link>
      <Link href={hrefWith({ sport: "FOOTBALL" })} className={cn(pill, sport === "FOOTBALL" ? on : off)}>⚽ Football</Link>
      {hasTeam && (
        <Link
          href={hrefWith({ mine: mine ? null : "1" })}
          className={cn(pill, mine ? "ring-gold-400 bg-gold-500/20 text-gold-300" : off)}
        >
          {mine ? "★ My team" : "☆ My team"}
        </Link>
      )}
    </div>
  );
}
