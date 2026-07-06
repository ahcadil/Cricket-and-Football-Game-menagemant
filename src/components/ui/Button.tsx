import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "gold" | "ghost" | "danger";

export function Button({
  className, variant = "primary", ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const cls = {
    primary: "btn-primary",
    gold: "btn-gold",
    ghost: "btn-ghost",
    danger: "btn-danger",
  }[variant];
  return <button className={cn(cls, className)} {...props} />;
}
