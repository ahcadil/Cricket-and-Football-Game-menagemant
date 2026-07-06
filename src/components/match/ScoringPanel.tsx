"use client";
import { useState, useEffect, useCallback } from "react";
import { Select } from "@/components/ui/Select";
import { Field, Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  addCricketBallAction,
  closeInningsAction,
  addFootballEventAction,
  deleteCricketEventAction,
  deleteFootballEventAction,
} from "@/server/actions/score";

interface PlayerOpt { id: string; name: string }

type WicketType = "BOWLED" | "CAUGHT" | "LBW" | "RUNOUT" | "STUMPED" | "HITWICKET";
type ExtraType = "WIDE" | "NOBALL" | "BYE" | "LEGBYE";

const WICKET_OPTIONS: { value: WicketType; label: string; short: string }[] = [
  { value: "BOWLED",    label: "Bowled",     short: "B" },
  { value: "CAUGHT",    label: "Caught",     short: "C" },
  { value: "LBW",       label: "LBW",        short: "LBW" },
  { value: "RUNOUT",    label: "Run out",    short: "RO" },
  { value: "STUMPED",   label: "Stumped",    short: "St" },
  { value: "HITWICKET", label: "Hit wicket", short: "HW" },
];

const EXTRA_OPTIONS: { value: ExtraType; label: string; short: string }[] = [
  { value: "WIDE",   label: "Wide",     short: "Wd" },
  { value: "NOBALL", label: "No-ball",  short: "Nb" },
  { value: "BYE",    label: "Bye",      short: "B" },
  { value: "LEGBYE", label: "Leg bye",  short: "Lb" },
];

export function CricketScoringPanel(props: {
  matchId: string;
  inningsId: string;
  players: { batting: PlayerOpt[]; bowling: PlayerOpt[] };
  recentEvents: { id: string; over: number; ball: number; runs: number; isWicket: boolean; extraType: string | null }[];
  seed: { strikerId: string | null; nonStrikerId: string | null; bowlerId: string | null; ballsThisOver: number };
  outIds: string[];
}) {
  // Crease state lives here so the batsman/bowler selection survives every ball
  // (and the RSC refresh after each server action). Seeded once from the server.
  const [strikerId, setStrikerId] = useState<string | null>(props.seed.strikerId);
  const [nonStrikerId, setNonStrikerId] = useState<string | null>(props.seed.nonStrikerId);
  const [bowlerId, setBowlerId] = useState<string | null>(props.seed.bowlerId);
  const [ballsThisOver, setBallsThisOver] = useState<number>(props.seed.ballsThisOver);
  const [freeHit, setFreeHit] = useState(false);
  const [needNewBatsman, setNeedNewBatsman] = useState(false);

  const swapStrike = () => {
    setStrikerId(nonStrikerId);
    setNonStrikerId(strikerId);
  };

  // Called after a ball is committed to the DB — applies strike rotation, over
  // rollover, free-hit tracking and wicket handling (all client-side).
  const applyBall = useCallback((d: { runs: number; extraType: ExtraType | null; isWicket: boolean }) => {
    const legal = !d.extraType || d.extraType === "BYE" || d.extraType === "LEGBYE";
    const nextBalls = legal ? ballsThisOver + 1 : ballsThisOver;
    const overSwap = legal && nextBalls === 6;
    setBallsThisOver(overSwap ? 0 : nextBalls);

    // free hit: set by a no-ball, cleared once a legal delivery follows
    setFreeHit(d.extraType === "NOBALL" ? true : legal ? false : freeHit);

    if (d.isWicket) {
      // striker is out — force a replacement pick; keep the non-striker.
      setStrikerId(null);
      setNeedNewBatsman(true);
      // if the over also ended, the not-out batter takes strike next over
      if (overSwap) { setStrikerId(nonStrikerId); setNonStrikerId(null); }
      return;
    }

    const crossing = d.runs === 4 || d.runs === 6 ? 0 : d.runs; // boundaries never cross
    const runsSwap = crossing % 2 === 1;
    if (runsSwap !== overSwap) swapStrike(); // XOR: rotate strike
  }, [ballsThisOver, freeHit, nonStrikerId, strikerId]);

  const battingAvailable = props.players.batting.filter(
    p => !props.outIds.includes(p.id) && p.id !== nonStrikerId,
  );

  return (
    <div className="space-y-4">
      {/* AT THE CREASE */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="label !mb-0">At the crease</p>
          <button
            type="button"
            onClick={swapStrike}
            className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1"
          >⇄ swap strike</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Striker <span className="text-gold-400">*</span></label>
            <Select value={strikerId ?? ""} onChange={e => setStrikerId(e.target.value || null)}>
              <option value="">— striker —</option>
              {props.players.batting.map(p => (
                <option key={p.id} value={p.id} disabled={props.outIds.includes(p.id) || p.id === nonStrikerId}>
                  {p.name}{props.outIds.includes(p.id) ? " (out)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Non-striker</label>
            <Select value={nonStrikerId ?? ""} onChange={e => setNonStrikerId(e.target.value || null)}>
              <option value="">— non-striker —</option>
              {props.players.batting.map(p => (
                <option key={p.id} value={p.id} disabled={props.outIds.includes(p.id) || p.id === strikerId}>
                  {p.name}{props.outIds.includes(p.id) ? " (out)" : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <label className="label">Bowler</label>
          <Select value={bowlerId ?? ""} onChange={e => setBowlerId(e.target.value || null)}>
            <option value="">— bowler —</option>
            {props.players.bowling.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        {needNewBatsman && (
          <p className="text-xs text-gold-300 bg-gold-500/10 ring-1 ring-gold-500/30 rounded-lg px-3 py-2">
            Wicket fell — pick the new striker above to continue.
          </p>
        )}
        {freeHit && (
          <p className="text-xs text-brand-200 bg-brand-500/10 ring-1 ring-brand-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="live-dot" /> FREE HIT — batter can only be run out.
          </p>
        )}
      </div>

      <CricketAddBall
        matchId={props.matchId}
        strikerId={strikerId}
        bowlerId={bowlerId}
        freeHit={freeHit}
        onCommitted={applyBall}
      />

      <form action={closeInningsAction} className="card p-4">
        <input type="hidden" name="matchId" value={props.matchId} />
        <input type="hidden" name="inningsId" value={props.inningsId} />
        <Button variant="ghost" className="w-full">Close Innings (starts 2nd if first)</Button>
      </form>

      {props.recentEvents.length > 0 && (
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">Undo Recent</p>
          <ul className="space-y-1.5 text-sm">
            {props.recentEvents.slice(-6).reverse().map(e => (
              <li key={e.id} className="flex justify-between items-center gap-2">
                <span className="text-slate-300 truncate">
                  <span className="text-slate-500">{e.over}.{e.ball}</span>{" "}
                  →{" "}
                  {e.isWicket
                    ? <span className="text-red-400 font-medium">WICKET</span>
                    : e.extraType
                      ? <span className="text-sky-300">{e.extraType.toLowerCase()} +{e.runs}</span>
                      : `${e.runs} run${e.runs === 1 ? "" : "s"}`}
                </span>
                <form action={deleteCricketEventAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-red-400 text-xs hover:text-red-300 px-2 py-1">undo</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CricketAddBall({
  matchId, strikerId, bowlerId, freeHit, onCommitted,
}: {
  matchId: string;
  strikerId: string | null;
  bowlerId: string | null;
  freeHit: boolean;
  onCommitted: (d: { runs: number; extraType: ExtraType | null; isWicket: boolean }) => void;
}) {
  const [runs, setRuns] = useState<number>(0);
  const [wicket, setWicket] = useState<WicketType | null>(null);
  const [extra, setExtra] = useState<ExtraType | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [pending, setPending] = useState(false);

  const ready = !!strikerId && !!bowlerId;

  const previewBits: string[] = [];
  if (extra) previewBits.push(`${extra.toLowerCase()}${runs > 0 ? ` +${runs}` : ""}`);
  else if (runs > 0) previewBits.push(`${runs} run${runs === 1 ? "" : "s"}`);
  else previewBits.push("dot ball");
  if (wicket) previewBits.push(`WICKET (${wicket.toLowerCase()})`);
  const preview = previewBits.join(" · ");

  const submitLabel = wicket
    ? `🎯 Add WICKET${runs > 0 ? ` + ${runs}` : ""}`
    : extra
      ? `Add ${extra.charAt(0) + extra.slice(1).toLowerCase()}${runs > 0 ? ` + ${runs}` : ""}`
      : `Add ${runs} run${runs === 1 ? "" : "s"}`;

  const submitClass = wicket ? "btn-danger" : extra ? "btn-gold" : "btn-primary";

  const reset = () => { setRuns(0); setWicket(null); setExtra(null); setShowNote(false); };

  const submit = useCallback(async () => {
    if (!ready || pending) return;
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("matchId", matchId);
      fd.set("runs", String(runs));
      if (strikerId) fd.set("batsmanId", strikerId);
      if (bowlerId) fd.set("bowlerId", bowlerId);
      if (wicket) { fd.set("isWicket", "1"); fd.set("wicketType", wicket); }
      if (extra) fd.set("extraType", extra);
      const noteEl = document.getElementById("ball-note") as HTMLTextAreaElement | null;
      if (noteEl?.value) fd.set("note", noteEl.value);
      await addCricketBallAction(fd);
      onCommitted({ runs, extraType: extra, isWicket: !!wicket });
      reset();
    } finally {
      setPending(false);
    }
  }, [ready, pending, matchId, runs, strikerId, bowlerId, wicket, extra, onCommitted]);

  // Keyboard scoring — ignore while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (typing) return;
      if (e.key >= "0" && e.key <= "6") { setRuns(Number(e.key)); e.preventDefault(); }
      else if (e.key.toLowerCase() === "w") { setWicket(w => (w ? null : "BOWLED")); e.preventDefault(); }
      else if (e.key === "Enter") { void submit(); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit]);

  return (
    <form
      action={async () => { await submit(); }}
      className={cn("card space-y-5", freeHit && "ring-brand-500/40")}
    >
      {/* RUNS */}
      <div>
        <p className="label">Runs on this ball</p>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map(n => (
            <PadButton
              key={n}
              active={runs === n}
              tone={n === 4 || n === 6 ? "boundary" : "neutral"}
              onClick={() => setRuns(n)}
            >
              {n}
            </PadButton>
          ))}
        </div>
      </div>

      {/* EXTRAS */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="label !mb-0">Extra (tap to toggle)</p>
          {extra && (
            <button type="button" onClick={() => setExtra(null)} className="text-xs text-slate-400 hover:text-white">clear</button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {EXTRA_OPTIONS.map(opt => (
            <PadButton
              key={opt.value}
              active={extra === opt.value}
              tone="extra"
              onClick={() => setExtra(extra === opt.value ? null : opt.value)}
            >
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.short}</span>
            </PadButton>
          ))}
        </div>
      </div>

      {/* WICKET */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="label !mb-0">Wicket (tap to toggle)</p>
          {wicket && (
            <button type="button" onClick={() => setWicket(null)} className="text-xs text-slate-400 hover:text-white">clear</button>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
          {WICKET_OPTIONS.map(opt => (
            <PadButton
              key={opt.value}
              active={wicket === opt.value}
              tone="wicket"
              onClick={() => setWicket(wicket === opt.value ? null : opt.value)}
            >
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.short}</span>
            </PadButton>
          ))}
        </div>
      </div>

      {/* PREVIEW */}
      <div className={cn(
        "rounded-xl px-4 py-3 ring-1 text-sm flex items-center gap-2 flex-wrap",
        wicket ? "ring-red-500/40 bg-red-500/10 text-red-200"
               : extra ? "ring-sky-500/40 bg-sky-500/10 text-sky-200"
                       : runs >= 4 ? "ring-gold-500/40 bg-gold-500/10 text-gold-200"
                                   : "ring-white/10 bg-black/30 text-slate-300"
      )}>
        <span className="font-medium">Next ball:</span>
        <span>{preview}</span>
      </div>

      {/* NOTE (collapsible) */}
      {showNote ? (
        <Field label="Note">
          <Textarea id="ball-note" name="note" maxLength={200} autoFocus placeholder="e.g. edge through slips" />
        </Field>
      ) : (
        <button type="button" onClick={() => setShowNote(true)} className="text-xs text-slate-400 hover:text-white">+ Add commentary note</button>
      )}

      <button type="submit" disabled={pending || !ready} className={cn(submitClass, "w-full text-base")}>
        {!ready ? "Select striker & bowler first" : pending ? "Adding…" : submitLabel}
      </button>
      <p className="text-[11px] text-slate-500 text-center -mt-2">
        Shortcuts: <kbd className="px-1 rounded bg-white/10">0</kbd>–<kbd className="px-1 rounded bg-white/10">6</kbd> runs ·
        {" "}<kbd className="px-1 rounded bg-white/10">W</kbd> wicket · <kbd className="px-1 rounded bg-white/10">Enter</kbd> add
      </p>
    </form>
  );
}

function PadButton({
  children, active, onClick, tone,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone: "neutral" | "boundary" | "extra" | "wicket";
}) {
  const baseInactive = "bg-black/30 ring-white/10 text-slate-200 hover:bg-white/5";
  const toneClass: Record<typeof tone, string> = {
    neutral:  "bg-gradient-to-br from-brand-300 to-brand-500 text-pitch-dark ring-brand-400 shadow-glow-brand",
    boundary: "bg-gradient-to-br from-gold-300 to-gold-500 text-pitch-dark ring-gold-400 shadow-glow-gold",
    extra:    "bg-gradient-to-br from-sky-400 to-sky-600 text-white ring-sky-400",
    wicket:   "bg-gradient-to-br from-red-500 to-red-600 text-white ring-red-400 shadow-glow-red",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-11 sm:h-12 rounded-lg ring-1 text-sm font-medium transition active:scale-[0.97]",
        active ? toneClass[tone] : baseInactive
      )}
    >
      {children}
    </button>
  );
}

/* ============================== FOOTBALL =============================== */

type FbEvent = "GOAL" | "OWN_GOAL" | "YELLOW" | "RED" | "SUB_IN" | "SUB_OUT" | "PENALTY" | "MISSED_PEN";

const FB_EVENTS: { value: FbEvent; label: string; icon: string; tone: "goal" | "card" | "neutral" }[] = [
  { value: "GOAL",        label: "Goal",         icon: "⚽",  tone: "goal" },
  { value: "PENALTY",     label: "Penalty",      icon: "🎯",  tone: "goal" },
  { value: "MISSED_PEN",  label: "Pen Missed",   icon: "❌",  tone: "neutral" },
  { value: "OWN_GOAL",    label: "Own Goal",     icon: "🥅",  tone: "neutral" },
  { value: "YELLOW",      label: "Yellow Card",  icon: "🟨",  tone: "card" },
  { value: "RED",         label: "Red Card",     icon: "🟥",  tone: "card" },
  { value: "SUB_IN",      label: "Sub In",       icon: "🔼",  tone: "neutral" },
  { value: "SUB_OUT",     label: "Sub Out",      icon: "🔽",  tone: "neutral" },
];

export function FootballScoringPanel(props: {
  matchId: string;
  teams: { id: string; name: string }[];
  players: PlayerOpt[];
  recentEvents: { id: string; minute: number; type: string }[];
}) {
  const [submitKey, setSubmitKey] = useState(0);
  return (
    <div className="space-y-4">
      <FootballAddEvent
        key={submitKey}
        matchId={props.matchId}
        teams={props.teams}
        players={props.players}
        onSubmitted={() => setSubmitKey(k => k + 1)}
      />

      {props.recentEvents.length > 0 && (
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">Undo Recent</p>
          <ul className="space-y-1.5 text-sm">
            {props.recentEvents.slice(-6).reverse().map(e => (
              <li key={e.id} className="flex justify-between items-center">
                <span className="text-slate-300">
                  <span className="text-slate-500">{e.minute}'</span> · {e.type}
                </span>
                <form action={deleteFootballEventAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-red-400 text-xs hover:text-red-300 px-2 py-1">undo</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FootballAddEvent({
  matchId, teams, players, onSubmitted,
}: {
  matchId: string;
  teams: { id: string; name: string }[];
  players: PlayerOpt[];
  onSubmitted: () => void;
}) {
  const [type, setType] = useState<FbEvent>("GOAL");
  const [teamId, setTeamId] = useState<string>(teams[0]?.id ?? "");
  const [minute, setMinute] = useState<number>(45);
  const [showNote, setShowNote] = useState(false);
  const [pending, setPending] = useState(false);

  const selected = FB_EVENTS.find(e => e.value === type)!;
  const submitClass =
    selected.tone === "goal" ? "btn-gold" :
    selected.tone === "card" ? "btn-danger" : "btn-primary";

  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await addFootballEventAction(fd);
          onSubmitted();
        } finally {
          setPending(false);
        }
      }}
      className="card space-y-5"
    >
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="teamId" value={teamId} />

      {/* TEAM */}
      <div>
        <p className="label">Team scoring / committing</p>
        <div className="grid grid-cols-2 gap-2">
          {teams.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTeamId(t.id)}
              aria-pressed={teamId === t.id}
              className={cn(
                "h-12 rounded-lg ring-1 text-sm font-medium transition active:scale-[0.97]",
                teamId === t.id
                  ? "bg-gradient-to-br from-brand-300 to-brand-500 text-pitch-dark ring-brand-400"
                  : "bg-black/30 ring-white/10 text-slate-200 hover:bg-white/5"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* EVENT TYPE */}
      <div>
        <p className="label">Event</p>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {FB_EVENTS.map(e => (
            <button
              key={e.value}
              type="button"
              onClick={() => setType(e.value)}
              aria-pressed={type === e.value}
              className={cn(
                "h-16 rounded-lg ring-1 text-xs sm:text-sm font-medium transition active:scale-[0.97] flex flex-col items-center justify-center gap-0.5",
                type === e.value
                  ? e.tone === "goal" ? "bg-gradient-to-br from-gold-300 to-gold-500 text-pitch-dark ring-gold-400"
                  : e.tone === "card" ? "bg-gradient-to-br from-red-500 to-red-600 text-white ring-red-400"
                  : "bg-gradient-to-br from-brand-300 to-brand-500 text-pitch-dark ring-brand-400"
                  : "bg-black/30 ring-white/10 text-slate-200 hover:bg-white/5"
              )}
            >
              <span className="text-lg">{e.icon}</span>
              <span className="leading-tight text-center">{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MINUTE + PLAYER */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Minute">
          <Input
            name="minute"
            type="number"
            min={0}
            max={130}
            required
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
          />
        </Field>
        <Field label="Player (optional)">
          <Select name="playerId" defaultValue="">
            <option value="">—</option>
            {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      </div>

      {/* PREVIEW */}
      <div className={cn(
        "rounded-xl px-4 py-3 ring-1 text-sm flex items-center gap-2 flex-wrap",
        selected.tone === "goal" ? "ring-gold-500/40 bg-gold-500/10 text-gold-200" :
        selected.tone === "card" ? "ring-red-500/40 bg-red-500/10 text-red-200" :
        "ring-white/10 bg-black/30 text-slate-300"
      )}>
        <span className="font-medium">{minute}'</span>
        <span>{selected.icon}</span>
        <span>{selected.label}</span>
        <span className="text-slate-500">·</span>
        <span>{teams.find(t => t.id === teamId)?.name ?? "—"}</span>
      </div>

      {/* NOTE */}
      {showNote ? (
        <Field label="Note">
          <Textarea name="note" maxLength={200} autoFocus placeholder="e.g. header from corner" />
        </Field>
      ) : (
        <button type="button" onClick={() => setShowNote(true)} className="text-xs text-slate-400 hover:text-white">+ Add commentary note</button>
      )}

      <button type="submit" disabled={pending} className={cn(submitClass, "w-full text-base")}>
        {pending ? "Adding…" : `Add ${selected.label} at ${minute}'`}
      </button>
    </form>
  );
}
