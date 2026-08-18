import type { Driver } from "../types"
import { getPodiumColor } from "../lib/theme"
import ListRow from "./ui/ListRow"
import ProbabilityBar from "./ProbabilityBar"

interface DriverCardProps {
  driver: Driver
  position: number
  maxProbability: number
}

export default function DriverCard({ driver, position, maxProbability }: DriverCardProps) {
  return (
    <ListRow
      position={
        <span style={{ color: getPodiumColor(position - 1) }}>{position}</span>
      }
      team={driver.team}
      title={driver.driver_code}
      subtitle={`${driver.driver_name} · ${driver.team}`}
      trailing={
        <div className="w-full sm:w-48">
          <ProbabilityBar
            probability={driver.win_probability}
            team={driver.team}
            maxProbability={maxProbability}
          />
        </div>
      }
    />
  )
}
