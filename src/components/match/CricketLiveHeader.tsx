// Prominent live-score strip for the scoring cockpit. Server component.
// Total comes from the trustworthy innings.runs; overs/CRR/chase from the
// derived card. Shows chase math (target, need N off M, RRR) in the 2nd innings.
import { fmtOvers } from "@/lib/format";
import { currentRunRate, projectedScore, chaseInfo } from "@/lib/cricket";

interface Props {
  battingTeam: string;
  primaryColor: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  oversPerSide: number | null;
  inningsOrder: number;
  /** first innings total, when scoring the 2nd innings (for the chase) */
  targetBase?: number | null;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-lg sm:text-xl font-display ${accent ? "text-gold-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

export function CricketLiveHeader({
  battingTeam, primaryColor, runs, wickets, legalBalls, oversPerSide, inningsOrder, targetBase,
}: Props) {
  const crr = currentRunRate(runs, legalBalls);
  const projected = projectedScore(runs, legalBalls, oversPerSide);
  const isChase = inningsOrder === 2 && targetBase != null;
  const chase = isChase ? chaseInfo(targetBase! + 1, runs, legalBalls, oversPerSide) : null;

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="relative p-5 sm:p-6 bg-gradient-to-br from-pitch-light/40 via-pitch-dark to-pitch-dark">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-400 mb-1 flex items-center gap-2">
              <span className="live-dot" /> Innings {inningsOrder} · Batting
            </p>
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
              <h2 className="text-xl sm:text-2xl truncate">{battingTeam}</h2>
            </div>
          </div>
          <p className="font-display leading-none whitespace-nowrap">
            <span className="text-4xl sm:text-6xl">{runs}</span>
            <span className="text-2xl sm:text-4xl text-slate-500">/{wickets}</span>
            <span className="text-lg sm:text-2xl text-slate-400 ml-2">
              ({fmtOvers(legalBalls)}{oversPerSide ? `/${oversPerSide}` : ""})
            </span>
          </p>
        </div>

        {/* stat row */}
        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 justify-center sm:justify-start">
          <Stat label="CRR" value={crr.toFixed(2)} />
          {!isChase && projected != null && <Stat label="Projected" value={String(projected)} />}
          {isChase && chase && (
            <>
              <Stat label="Target" value={String(chase.target)} accent />
              <Stat label="Need" value={`${chase.runsNeeded} off ${chase.ballsRemaining}`} />
              <Stat label="Req. RR" value={chase.requiredRunRate != null ? chase.requiredRunRate.toFixed(2) : "—"} accent />
            </>
          )}
        </div>

        {/* chase result-imminent banner */}
        {isChase && chase && (
          <div className="relative z-10 mt-4">
            {chase.done ? (
              <p className="text-brand-300 text-sm font-medium">🏆 Target reached — {battingTeam} win.</p>
            ) : chase.ballsRemaining === 0 ? (
              <p className="text-red-300 text-sm font-medium">Overs done — {battingTeam} fall {chase.runsNeeded} short.</p>
            ) : (
              <p className="text-slate-300 text-sm">
                {battingTeam} need <span className="text-white font-medium">{chase.runsNeeded}</span> from{" "}
                <span className="text-white font-medium">{chase.ballsRemaining}</span> balls
                {chase.runsNeeded <= 12 && <span className="text-gold-400"> · tense finish!</span>}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
