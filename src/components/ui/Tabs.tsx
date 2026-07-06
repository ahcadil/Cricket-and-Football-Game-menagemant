"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";

export function Tabs({ items }: { items: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="tab-strip">
        {items.map((it, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              "px-4 py-2.5 text-sm rounded-t-lg whitespace-nowrap shrink-0",
              active === i ? "bg-white/5 text-white ring-1 ring-white/10" : "text-slate-400 hover:text-white"
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div>{items[active]?.content}</div>
    </div>
  );
}
