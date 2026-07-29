// Professional squad-auction budget model.
//
// A team must field a full squad of SQUAD_SIZE players out of a fixed purse.
// The core rule (as used in real player auctions): a team may never spend so
// much on one player that it can no longer afford the players it still needs.
// So every unfilled slot after the current one reserves at least MIN_PLAYER_PRICE,
// and the most a team can bid right now is `maxBid`.

export const SQUAD_SIZE = 11;

// Floor reserved for each still-empty squad slot, so the squad can always be
// completed. Kept as a single knob — tune here if the squad economics change.
export const MIN_PLAYER_PRICE = 50_000_000; // ₹50M minimum reserve per remaining slot

export interface BudgetView {
  budget: number;      // total purse
  spent: number;       // committed so far
  remaining: number;   // purse left
  squadCount: number;  // players already bought
  slotsLeft: number;   // squad slots still to fill
  full: boolean;       // squad complete
  perPlayer: number;   // remaining ÷ slotsLeft — average affordable price / slot
  maxBid: number;      // most spendable on the NEXT player while still filling the squad
}

export function budgetView(t: { budget: number | bigint; spent: number | bigint; squadCount: number }): BudgetView {
  const budget = Number(t.budget);
  const spent = Number(t.spent);
  const remaining = budget - spent;
  const slotsLeft = Math.max(0, SQUAD_SIZE - t.squadCount);
  const full = slotsLeft <= 0;
  const perPlayer = slotsLeft > 0 ? Math.floor(remaining / slotsLeft) : 0;
  // reserve MIN_PLAYER_PRICE for every OTHER unfilled slot
  const maxBid = slotsLeft > 0 ? Math.max(0, remaining - (slotsLeft - 1) * MIN_PLAYER_PRICE) : 0;
  return { budget, spent, remaining, squadCount: t.squadCount, slotsLeft, full, perPlayer, maxBid };
}
