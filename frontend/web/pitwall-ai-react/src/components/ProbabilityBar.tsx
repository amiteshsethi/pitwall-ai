import { getTeamColor } from "../lib/theme"

interface ProbabilityBarProps {
  probability: number
  maxProbability: number
  team: string
}

export default function ProbabilityBar({
  probability,
  maxProbability,
  team,
}: ProbabilityBarProps) {
  const color = getTeamColor(team)
  const width = Math.max((probability / maxProbability) * 100, 2)

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 rounded-full h-0.5 sm:h-1" style={{ backgroundColor: "#27272a" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-bold text-white w-10 sm:w-12 text-right tabular-nums">
        {probability}%
      </span>
    </div>
  )
}
