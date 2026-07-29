import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { getStandings, type StandingRow } from "@/lib/standings";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [cricket, football] = await Promise.all([getStandings("CRICKET"), getStandings("FOOTBALL")]);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl sm:text-4xl">Standings</h1>
      <Tabs items={[
        { label: "🏏 Cricket", content: <Table rows={cricket} sport="CRICKET" /> },
        { label: "⚽ Football", content: <Table rows={football} sport="FOOTBALL" /> },
      ]} />
    </div>
  );
}

function Table({ rows, sport }: { rows: StandingRow[]; sport: "CRICKET" | "FOOTBALL" }) {
  if (rows.length === 0) {
    return <Card><p className="text-slate-400 text-sm">No teams yet for {sport.toLowerCase()}.</p></Card>;
  }
  return (
    <Card>
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-xs sm:text-sm min-w-[480px]">
          <thead className="text-slate-400 text-[10px] sm:text-xs uppercase">
            <tr>
              <th className="text-left py-2 px-1">#</th>
              <th className="text-left py-2 px-1">Team</th>
              <th className="text-right py-2 px-1">P</th>
              <th className="text-right py-2 px-1">W</th>
              <th className="text-right py-2 px-1">L</th>
              <th className="text-right py-2 px-1">T</th>
              {sport === "CRICKET" ? (
                <>
                  <th className="text-right py-2 px-1">RF</th>
                  <th className="text-right py-2 px-1">RA</th>
                  <th className="text-right py-2 px-1">NRR</th>
                </>
              ) : (
                <>
                  <th className="text-right py-2 px-1">GF</th>
                  <th className="text-right py-2 px-1">GA</th>
                  <th className="text-right py-2 px-1">GD</th>
                </>
              )}
              <th className="text-right py-2 px-1 font-bold">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              const rowBg = i === 0 ? "bg-gradient-to-r from-gold-500/10 to-transparent"
                          : i === 1 ? "bg-gradient-to-r from-slate-400/10 to-transparent"
                          : i === 2 ? "bg-gradient-to-r from-orange-500/10 to-transparent" : "";
              return (
              <tr key={r.teamId} className={rowBg}>
                <td className="py-3 px-1 text-slate-400 font-display">{medal ?? (i + 1)}</td>
                <td className="py-3 px-1 whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.primaryColor }} />
                    <span className="truncate max-w-[140px] sm:max-w-none font-medium">{r.teamName}</span>
                  </span>
                </td>
                <td className="py-3 px-1 text-right">{r.played}</td>
                <td className="py-3 px-1 text-right text-brand-300">{r.won}</td>
                <td className="py-3 px-1 text-right text-red-300">{r.lost}</td>
                <td className="py-3 px-1 text-right">{r.tied}</td>
                {sport === "CRICKET" ? (
                  <>
                    <td className="py-3 px-1 text-right">{r.runsFor}</td>
                    <td className="py-3 px-1 text-right">{r.runsAgainst}</td>
                    <td className={`py-3 px-1 text-right ${(r.nrr ?? 0) >= 0 ? "text-brand-300" : "text-red-300"}`}>
                      {(r.nrr ?? 0) > 0 ? "+" : ""}{(r.nrr ?? 0).toFixed(2)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-1 text-right">{r.goalsFor}</td>
                    <td className="py-3 px-1 text-right">{r.goalsAgainst}</td>
                    <td className={`py-3 px-1 text-right ${(r.diff ?? 0) >= 0 ? "text-brand-300" : "text-red-300"}`}>
                      {(r.diff ?? 0) > 0 ? "+" : ""}{r.diff}
                    </td>
                  </>
                )}
                <td className="py-3 px-1 text-right font-display text-gold-400">{r.points}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
