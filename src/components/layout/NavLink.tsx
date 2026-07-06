"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "relative px-3 py-1.5 rounded-md text-slate-300 hover:text-white transition",
        active && "text-white"
      )}
    >
      {children}
      {active && (
        <span className="absolute inset-x-2 -bottom-[18px] h-0.5 rounded-full bg-gradient-to-r from-brand-400 to-gold-400" />
      )}
    </Link>
  );
}
