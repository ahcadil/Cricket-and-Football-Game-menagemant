import { cn } from "@/lib/cn";

export function Avatar({ name, src, size = 40, className }: {
  name: string; src?: string | null; size?: number; className?: string;
}) {
  const initials = name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className={cn("inline-flex items-center justify-center rounded-full bg-brand-700/40 ring-1 ring-white/10 font-display text-brand-200 overflow-hidden", className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials || "?"}</span>
      )}
    </div>
  );
}
