import type { RaceScore, ScoreBreakdownItem } from "../types"

export default function RaceScoreCard({ score }: { score: RaceScore }) {
  const driverPicks = score.breakdown.filter((b) =>
    ["correct", "podium", "wrong"].includes(b.result),
  )
  const rookiePick = score.breakdown.find(
    (b) => b.result === "rookie_wrong" || b.result === "rookie_correct",
  )
  const podiumActuals = [score.actual_p1, score.actual_p2, score.actual_p3]
  const posLabels = ["Your P1 pick", "Your P2 pick", "Your P3 pick"]

  const cellStyle = (result: string) => {
    if (result === "correct") return { backgroundColor: "#052e16", borderColor: "#166534" }
    if (result === "podium") return { backgroundColor: "#1c1a00", borderColor: "#713f12" }
    return { backgroundColor: "#0d0d0d", borderColor: "#18181b" }
  }

  const badgeStyle = (result: string) => {
    if (result === "correct") return "bg-green-500/20 text-green-400"
    if (result === "podium") return "bg-yellow-500/20 text-yellow-400"
    return "bg-zinc-800 text-zinc-500"
  }

  const driverColor = (result: string) => {
    if (result === "correct") return "text-green-400"
    if (result === "podium") return "text-yellow-400"
    return "text-white"
  }

  const badgeLabel = (item: ScoreBreakdownItem) => {
    if (item.result === "correct") return `correct · +${item.points}pts`
    if (item.result === "podium") return `on podium · +${item.points}pts`
    return "missed · +0pts"
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#090909", border: "1px solid #18181b" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between px-4 sm:px-5 py-4 border-b border-[#27272a] gap-3">
        <div>
          <p className="label-eyebrow mb-1">Round {score.round}</p>
          <p className="text-white font-black text-lg leading-none">{score.race_name}</p>
          <p className="text-zinc-500 text-xs mt-1.5">
            Actual podium: {score.actual_p1} · {score.actual_p2} · {score.actual_p3}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-3xl font-black text-red-500">{score.total_points}</p>
          <p className="text-zinc-500 text-xs">pts this race</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#27272a]">
        {driverPicks.map((item, i) => (
          <div
            key={i}
            className="px-4 py-3 border-b sm:border-b-0 last:border-b-0"
            style={cellStyle(item.result)}
          >
            <p className="text-zinc-500 text-xs mb-2">{posLabels[i]}</p>
            <p className={`font-black text-lg leading-none ${driverColor(item.result)}`}>
              {item.pick}
            </p>
            <p className="text-zinc-500 text-xs mt-1">Actual: {podiumActuals[i]}</p>
            <span
              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-2 ${badgeStyle(item.result)}`}
            >
              {badgeLabel(item)}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#27272a] border-t border-[#27272a]">
        {[
          { label: "Driver pts", value: score.driver_points, color: "text-white" },
          { label: "Constructor pts", value: score.constructor_points, color: "text-white" },
          { label: "Rookie pts", value: score.rookie_points, color: "text-purple-400" },
          {
            label: "Rookie pick",
            value: rookiePick?.pick ?? "—",
            color:
              rookiePick?.result === "rookie_correct" ? "text-purple-400" : "text-zinc-400",
          },
        ].map((item) => (
          <div key={item.label} className="px-4 py-3 text-center">
            <p className={`font-black text-lg ${item.color}`}>{item.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
