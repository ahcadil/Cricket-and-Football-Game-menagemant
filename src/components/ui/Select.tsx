import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input bg-black/50 appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}
