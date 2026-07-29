import { formatM } from "@/lib/validators";
import { SQUAD_SIZE, MIN_PLAYER_PRICE, budgetView } from "@/lib/auction";

export function BudgetBar({ budget, spent, squadCount }: { budget: number | bigint; spent: number | bigint; squadCount?: number }) {
  const numBudget = Number(budget);
  const numSpent = Number(spent);
  const pct = numBudget > 0 ? Math.min(100, Math.round((numSpent / numBudget) * 100)) : 0;
  const remaining = numBudget - numSpent;
  const bv = squadCount !== undefined ? budgetView({ budget: numBudget, spent: numSpent, squadCount }) : null;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-300 mb-1">
        <span>{formatM(spent)} spent</span>
        <span className={remaining < 0 ? "text-red-400" : "text-brand-300"}>{formatM(remaining)} left</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${pct >= 100 ? "bg-red-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
      </div>
      {bv && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          Squad <span className="text-slate-200">{bv.squadCount}/{SQUAD_SIZE}</span>
          {!bv.full && (
            <>
              {" · ~"}
              <span className={bv.perPlayer < MIN_PLAYER_PRICE ? "text-red-400 font-bold" : "text-gold-400"}>
                {formatM(bv.perPlayer)}
              </span>
              {" per remaining slot"}
              {bv.perPlayer < MIN_PLAYER_PRICE && <span className="text-red-400 text-[10px] ml-1">(min 50M required)</span>}
            </>
          )}
          {bv.full && <span className="text-brand-300"> · complete ✓</span>}
        </p>
      )}
    </div>
  );
}
