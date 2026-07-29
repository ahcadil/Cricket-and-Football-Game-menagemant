"use client";
import { useState, useMemo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/player/StatusBadge";
import { EditPlayerModal } from "@/components/player/EditPlayerModal";
import { ApproveAllForm } from "@/components/player/ApproveAllForm";
import { BulkPlayerImport } from "@/components/player/BulkPlayerImport";
import { ClearAllPlayersButton } from "@/components/player/ClearAllPlayersButton";
import { approvePlayerAction, rejectPlayerAction, setBasePriceAction } from "@/server/actions/adminPlayer";
import { markOnBlockAction } from "@/server/actions/auction";
import { formatM, formatMillion, tierFromBasePrice } from "@/lib/validators";
import type { PlayerProfile, User } from "@prisma/client";
import Link from "next/link";

type Row = PlayerProfile & { user: Pick<User, "name" | "email"> };

interface Props {
  submitted: Row[];
  approved: Row[];
  rejected: Row[];
  totalPoolValuation: number;
}

const BASE_PRICE_PRESETS = [
  { label: "10M", val: 10_000_000 },
  { label: "20M", val: 20_000_000 },
  { label: "50M", val: 50_000_000 },
  { label: "100M", val: 100_000_000 },
];

const REJECT_REASONS = [
  "Incomplete profile details",
  "Invalid or unverified photo URL",
  "Duplicate account registration",
  "Incorrect sport position info",
];

export function AdminPlayerManager({ submitted, approved, rejected, totalPoolValuation }: Props) {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState<"ALL" | "CRICKET" | "FOOTBALL">("ALL");

  const filterRows = (rows: Row[]) => {
    return rows.filter((r) => {
      const matchesSearch =
        !search ||
        r.user.name.toLowerCase().includes(search.toLowerCase()) ||
        r.user.email.toLowerCase().includes(search.toLowerCase()) ||
        (r.city && r.city.toLowerCase().includes(search.toLowerCase())) ||
        (r.session && r.session.toLowerCase().includes(search.toLowerCase()));

      const matchesSport = sportFilter === "ALL" || r.sport === sportFilter;

      return matchesSearch && matchesSport;
    });
  };

  const filteredSubmitted = useMemo(() => filterRows(submitted), [submitted, search, sportFilter]);
  const filteredApproved = useMemo(() => filterRows(approved), [approved, search, sportFilter]);
  const filteredRejected = useMemo(() => filterRows(rejected), [rejected, search, sportFilter]);

  const cricketCount = approved.filter((p) => p.sport === "CRICKET").length + submitted.filter((p) => p.sport === "CRICKET").length;
  const footballCount = approved.filter((p) => p.sport === "FOOTBALL").length + submitted.filter((p) => p.sport === "FOOTBALL").length;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-normal text-gold-400">Tournament Administration</p>
          <h1 className="text-3xl sm:text-4xl heading-gradient font-normal tracking-tight">Player Pool Management</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Review player submissions, set starting base price tiers, and approve players for the auction block.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BulkPlayerImport />
          <ClearAllPlayersButton totalPlayers={submitted.length + approved.length + rejected.length} />
          <Link href="/admin/auction" className="px-3 py-2 rounded-xl bg-gold-500/20 text-gold-300 hover:bg-gold-500/35 ring-1 ring-gold-400/40 text-xs font-normal transition active:scale-95">
            🔨 Auction Desk ↗
          </Link>
        </div>
      </header>

      {/* QUICK STATS METRICS GRID */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card !p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-normal">Pending Approval</p>
          <p className="text-2xl sm:text-3xl font-display text-amber-300 mt-1 flex items-center gap-2">
            {submitted.length}
            {submitted.length > 0 && <span className="animate-ping w-2 h-2 rounded-full bg-amber-400" />}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Submissions waiting</p>
        </div>

        <div className="card !p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-normal">Approved Pool</p>
          <p className="text-2xl sm:text-3xl font-display text-brand-300 mt-1">{approved.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Auction ready players</p>
        </div>

        <div className="card !p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-normal">Sport Breakdown</p>
          <p className="text-lg sm:text-xl font-display text-white mt-1">🏏 {cricketCount} · ⚽ {footballCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Cricket vs Football</p>
        </div>

        <div className="card !p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-normal">Pool Starting Value</p>
          <p className="text-2xl sm:text-3xl font-display text-gold-300 mt-1">{formatM(totalPoolValuation)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{formatMillion(totalPoolValuation)}</p>
        </div>
      </section>

      {/* SEARCH AND SPORT FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/40 p-3 rounded-2xl ring-1 ring-white/10">
        <div className="relative flex-1 w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by player name, email, session (24-25), or city..."
            className="input pl-9 text-xs font-normal w-full"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "CRICKET", "FOOTBALL"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-normal transition ring-1 cursor-pointer whitespace-nowrap ${
                sportFilter === s
                  ? "bg-gold-500/20 text-gold-300 ring-gold-400/50"
                  : "bg-black/40 text-slate-400 ring-white/10 hover:text-white"
              }`}
            >
              {s === "ALL" ? "All Sports" : s === "CRICKET" ? "🏏 Cricket" : "⚽ Football"}
            </button>
          ))}
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-xs font-normal border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === "pending"
              ? "border-amber-400 text-amber-300 font-medium"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>⏳ Pending Submissions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30">
            {filteredSubmitted.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("approved")}
          className={`px-4 py-2 text-xs font-normal border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === "approved"
              ? "border-brand-400 text-brand-300 font-medium"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>✅ Approved Players</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-500/20 text-brand-300 ring-1 ring-brand-400/30">
            {filteredApproved.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("rejected")}
          className={`px-4 py-2 text-xs font-normal border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === "rejected"
              ? "border-red-400 text-red-300 font-medium"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>❌ Rejected</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300 ring-1 ring-red-400/30">
            {filteredRejected.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: PENDING */}
      {activeTab === "pending" && (
        <div className="space-y-4 animate-rise">
          <ApproveAllForm count={submitted.length} />

          {filteredSubmitted.length === 0 ? (
            <div className="card text-center py-10 space-y-2">
              <span className="text-4xl opacity-40">⏳</span>
              <p className="text-slate-400 text-sm font-normal">No pending player submissions matching filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmitted.map((p) => (
                <PendingCard key={p.id} player={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: APPROVED */}
      {activeTab === "approved" && (
        <div className="animate-rise">
          {filteredApproved.length === 0 ? (
            <div className="card text-center py-10 space-y-2">
              <span className="text-4xl opacity-40">🛡️</span>
              <p className="text-slate-400 text-sm font-normal">No approved players matching filters.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApproved.map((p) => (
                <ApprovedCard key={p.id} player={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: REJECTED */}
      {activeTab === "rejected" && (
        <div className="animate-rise">
          {filteredRejected.length === 0 ? (
            <div className="card text-center py-10 space-y-2">
              <span className="text-4xl opacity-40">🍃</span>
              <p className="text-slate-400 text-sm font-normal">No rejected player records matching filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRejected.map((p) => (
                <RejectedCard key={p.id} player={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PendingCard({ player }: { player: Row }) {
  const [basePrice, setBasePrice] = useState<number>(Number(player.basePrice) || 50_000_000);
  const [note, setNote] = useState("");

  const roleDisplay = player.sport === "CRICKET" ? player.cricketRole ?? "—" : player.footballPosition ?? "—";

  return (
    <div className="card !p-5 space-y-4 ring-1 ring-amber-500/20 hover:ring-amber-500/40 transition">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            <Avatar name={player.user.name} src={player.photoUrl} size={64} className="ring-2 ring-amber-400/50" />
            <span
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full ring-2 ring-black flex items-center justify-center text-xs"
              style={{ backgroundColor: player.sport === "CRICKET" ? "#1aae72" : "#f5c542" }}
            >
              {player.sport === "CRICKET" ? "🏏" : "⚽"}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-normal text-white truncate">{player.user.name}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-gold-500/20 text-gold-300 ring-1 ring-gold-400/40">
                Tier {tierFromBasePrice(basePrice)}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">{player.user.email}</p>
            <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap mt-1 font-normal">
              <span className="text-gold-300 font-normal">{roleDisplay}</span>
              <span>·</span>
              <span>Session {player.session || "24-25"}</span>
              {player.experienceYears > 0 && (
                <>
                  <span>·</span>
                  <span className="text-slate-400">⭐ {player.experienceYears}y exp</span>
                </>
              )}
              {player.city && (
                <>
                  <span>·</span>
                  <span className="text-slate-400">📍 {player.city}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <EditPlayerModal player={player} />
      </div>

      {player.bio && <p className="text-xs text-slate-300 bg-black/40 p-2.5 rounded-xl ring-1 ring-white/5 line-clamp-2">{player.bio}</p>}

      {/* ACTION FORMS ROW */}
      <div className="grid lg:grid-cols-2 gap-4 pt-2 border-t border-white/10">
        {/* APPROVE FORM */}
        <form action={approvePlayerAction} className="space-y-2 bg-black/40 p-3 rounded-xl ring-1 ring-brand-500/30">
          <input type="hidden" name="id" value={player.id} />
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wider text-brand-300 font-normal">Set Starting Base Price ($)</label>
            <span className="text-xs font-normal text-gold-300 font-mono">= {formatM(basePrice)}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
              <input
                name="basePrice"
                type="number"
                min={0}
                step={1000000}
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value) || 0)}
                className="input pl-6 text-xs font-normal text-brand-300 py-1.5"
                required
              />
            </div>
            <button type="submit" className="btn-primary text-xs font-normal py-1.5 px-4 shrink-0 cursor-pointer">
              ✅ Approve ({formatM(basePrice)})
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 pt-1 flex-wrap">
            <span className="text-[10px] text-slate-400">Quick Base:</span>
            {BASE_PRICE_PRESETS.map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setBasePrice(p.val)}
                className={`px-2 py-0.5 rounded text-[10px] font-normal transition ring-1 cursor-pointer ${
                  basePrice === p.val
                    ? "bg-gold-500/20 text-gold-300 ring-gold-400/50"
                    : "bg-black/40 text-slate-300 ring-white/10 hover:ring-white/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </form>

        {/* REJECT FORM */}
        <form action={rejectPlayerAction} className="space-y-2 bg-black/40 p-3 rounded-xl ring-1 ring-red-500/30">
          <input type="hidden" name="id" value={player.id} />
          <label className="text-[11px] uppercase tracking-wider text-red-300 font-normal block">Rejection Reason</label>
          <div className="flex items-center gap-2">
            <input
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              maxLength={300}
              placeholder="Enter reason for rejection..."
              className="input text-xs font-normal py-1.5 flex-1"
            />
            <button type="submit" className="btn-danger text-xs font-normal py-1.5 px-4 shrink-0 cursor-pointer">
              ❌ Reject
            </button>
          </div>

          <div className="flex items-center gap-1 pt-1 flex-wrap">
            {REJECT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNote(r)}
                className="px-2 py-0.5 rounded text-[10px] bg-black/40 text-slate-400 ring-1 ring-white/10 hover:text-slate-200 transition cursor-pointer"
              >
                {r}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}

function ApprovedCard({ player }: { player: Row }) {
  const [basePrice, setBasePrice] = useState<number>(Number(player.basePrice));
  const roleDisplay = player.sport === "CRICKET" ? player.cricketRole ?? "—" : player.footballPosition ?? "—";
  const tier = tierFromBasePrice(basePrice);
  const isOnAuction = player.status === "ON_AUCTION";
  const isSold = player.status === "SOLD";

  return (
    <div
      className={`card !p-5 flex flex-col justify-between space-y-4 ring-1 transition ${
        isOnAuction
          ? "ring-gold-400/80 bg-gradient-to-br from-gold-500/10 via-black/60 to-black/80 shadow-lg shadow-gold-500/10"
          : isSold
          ? "ring-brand-500/40 bg-gradient-to-br from-brand-500/10 via-black/60 to-black/80"
          : "ring-white/10 hover:ring-gold-400/40 bg-black/40 hover:bg-black/60"
      }`}
    >
      {/* HEADER ROW */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <Avatar name={player.user.name} src={player.photoUrl} size={52} className="ring-2 ring-gold-400/50" />
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-2 ring-black flex items-center justify-center text-[10px]"
              style={{ backgroundColor: player.sport === "CRICKET" ? "#1aae72" : "#f5c542" }}
            >
              {player.sport === "CRICKET" ? "🏏" : "⚽"}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-normal text-white truncate text-lg tracking-tight">{player.user.name}</h4>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-normal ring-1 ${
                  tier === "A"
                    ? "bg-gold-500/20 text-gold-300 ring-gold-400/50"
                    : tier === "B"
                    ? "bg-brand-500/20 text-brand-300 ring-brand-400/50"
                    : "bg-slate-800 text-slate-300 ring-white/10"
                }`}
              >
                Tier {tier}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">{player.user.email}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap text-xs">
              <StatusBadge status={player.status as any} />
              <span className="text-slate-400">·</span>
              <span className="text-slate-300 font-normal">Session {player.session || "24-25"}</span>
            </div>
          </div>
        </div>

        <EditPlayerModal player={player} />
      </div>

      {/* METADATA STRIP */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-300 bg-black/40 p-2.5 rounded-xl ring-1 ring-white/5 font-normal">
        <span>{player.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"} · <span className="text-gold-300 font-normal">{roleDisplay}</span></span>
        {player.experienceYears > 0 && <span className="text-slate-400">⭐ {player.experienceYears}y exp</span>}
      </div>

      {/* STARTING BASE PRICE SPOTLIGHT & PRESETS */}
      <div className="space-y-2 bg-black/50 p-3 rounded-xl ring-1 ring-white/10">
        <form action={setBasePriceAction} className="space-y-2">
          <input type="hidden" name="id" value={player.id} />
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-normal">Starting Base Price ($)</span>
            <span className="text-xs font-normal text-gold-300 font-mono">{formatM(basePrice)} ({formatMillion(basePrice)})</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
              <input
                name="basePrice"
                type="number"
                min={0}
                step={1000000}
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value) || 0)}
                className="input pl-6 text-xs font-normal text-gold-300 py-1.5"
                required
              />
            </div>
            <button type="submit" className="btn-ghost text-xs font-normal py-1.5 px-3 whitespace-nowrap cursor-pointer">
              Save Base
            </button>
          </div>
        </form>

        {/* 1-CLICK QUICK PRESETS */}
        <div className="flex items-center gap-1.5 pt-1 flex-wrap border-t border-white/5">
          <span className="text-[10px] text-slate-400 font-normal">Quick Set:</span>
          {[10_000_000, 20_000_000, 50_000_000, 100_000_000, 500_000_000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setBasePrice(amt)}
              className={`px-2 py-0.5 rounded text-[10px] font-normal transition ring-1 cursor-pointer ${
                basePrice === amt
                  ? "bg-gold-500/20 text-gold-300 ring-gold-400/50"
                  : "bg-black/40 text-slate-300 ring-white/10 hover:ring-white/30"
              }`}
            >
              {formatM(amt)}
            </button>
          ))}
        </div>
      </div>

      {/* QUICK ACTION TOOLBAR: PUSH TO AUCTION BLOCK */}
      {!isOnAuction && !isSold && (
        <form action={markOnBlockAction} className="w-full pt-1">
          <input type="hidden" name="playerId" value={player.id} />
          <button
            type="submit"
            className="w-full py-2 px-3 rounded-xl bg-gold-500/20 hover:bg-gold-500/35 text-gold-300 ring-1 ring-gold-400/40 text-xs font-normal transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🔨 Set Live on Auction Block</span>
          </button>
        </form>
      )}

      {isOnAuction && (
        <div className="w-full py-2 px-3 rounded-xl bg-gold-500/30 text-gold-300 ring-1 ring-gold-400/60 text-xs font-normal text-center flex items-center justify-center gap-2 animate-pulse">
          <span className="live-dot" /> Currently Live on Block
        </div>
      )}
    </div>
  );
}

function RejectedCard({ player }: { player: Row }) {
  return (
    <div className="card !p-4 flex items-center justify-between gap-4 ring-1 ring-red-500/30">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-normal text-white text-base">{player.user.name}</p>
          <span className="text-xs text-slate-400 font-normal">· {player.user.email}</span>
        </div>
        {player.rejectionNote && <p className="text-xs text-red-300 font-normal">Reason: "{player.rejectionNote}"</p>}
      </div>

      <EditPlayerModal player={player} />
    </div>
  );
}
