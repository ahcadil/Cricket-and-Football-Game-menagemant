import { formatMoney } from "@/lib/validators";

export function BudgetBar({ budget, spent }: { budget: number; spent: number }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const remaining = budget - spent;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-300 mb-1">
        <span>{formatMoney(spent)} spent</span>
        <span className={remaining < 0 ? "text-red-400" : "text-brand-300"}>{formatMoney(remaining)} left</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${pct >= 100 ? "bg-red-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
