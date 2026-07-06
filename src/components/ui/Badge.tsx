import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "gold" | "red" | "blue" | "slate";

const tones: Record<Tone, string> = {
  neutral: "ring-white/15 text-slate-300",
  brand: "ring-brand-500/50 text-brand-300 bg-brand-500/10",
  gold: "ring-gold-500/50 text-gold-400 bg-gold-500/10",
  red: "ring-red-500/50 text-red-300 bg-red-500/10",
  blue: "ring-sky-500/50 text-sky-300 bg-sky-500/10",
  slate: "ring-slate-500/50 text-slate-300 bg-slate-500/10",
};

export function Badge({ children, tone = "neutral", className }: {
  children: React.ReactNode; tone?: Tone; className?: string;
}) {
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}
