"use client";

import { useActionState, useState } from "react";
import { unlockAuctionAction } from "@/server/actions/auction";
import type { ActionState } from "@/lib/action";

interface AuctionLockModalProps {
  completedCount: number;
  developerInfo?: string;
  isAdmin?: boolean;
}

export function AuctionLockModal({
  completedCount,
  developerInfo = "Developed by AHC ADIL , CONTRACT:01988623349",
  isAdmin = true,
}: AuctionLockModalProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    unlockAuctionAction,
    null
  );
  const [secretInput, setSecretInput] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg overflow-hidden border rounded-3xl border-gold-400/40 bg-gradient-to-br from-pitch-dark via-black to-pitch-light p-6 sm:p-8 shadow-2xl shadow-gold-500/20 text-center space-y-6">
        
        {/* Top Glow & Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-3xl shadow-inner">
          🔒
        </div>

        <div>
          <span className="inline-block px-3 py-1 text-xs font-mono font-bold tracking-wider text-gold-300 bg-gold-500/20 border border-gold-400/40 rounded-full uppercase mb-2">
            Milestone Lock ({completedCount} Players Completed)
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            Auction Locked
          </h2>
          <p className="text-slate-300 text-sm mt-1">
            Every 13 player auctions require entering the secret code to continue.
          </p>
        </div>

        {/* DEVELOPER CREDIT BANNER (EXACT USER SPECIFIED TEXT) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-900/60 via-black to-brand-900/60 border border-brand-400/40 text-center space-y-1">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Developer Credit</p>
          <p className="text-base sm:text-lg font-bold text-gold-300 font-mono tracking-tight select-all">
            {developerInfo}
          </p>
        </div>

        {/* UNLOCK FORM (FOR ADMIN) / NOTICE FOR PUBLIC */}
        {isAdmin ? (
          <form action={formAction} className="space-y-4 text-left">
            <div>
              <label htmlFor="secretCode" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Enter Secret Code to Unlock
              </label>
              <div className="relative">
                <input
                  id="secretCode"
                  type="password"
                  name="secretCode"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder="Enter secret code..."
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-400 font-mono text-center tracking-widest text-lg"
                />
              </div>
            </div>

            {state?.error && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs text-center font-medium">
                ⚠️ {state.error}
              </div>
            )}

            {state?.ok && (
              <div className="p-3 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs text-center font-medium">
                ✅ {state.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !secretInput.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-pitch-dark bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-gold-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider text-sm"
            >
              {isPending ? "Verifying Code..." : "🔓 Unlock & Continue Auction"}
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs text-center">
            The auction host must enter the secret code to unlock the next round of bidding.
          </div>
        )}
      </div>
    </div>
  );
}
