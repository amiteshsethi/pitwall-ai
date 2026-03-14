import type { Driver } from '../types'
import ProbabilityBar from './ProbabilityBar'

interface DriverCardProps {
  driver: Driver
  position: number
}

const positionColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-zinc-300',
  3: 'text-amber-600',
}

export default function DriverCard({ driver, position }: DriverCardProps) {
  const posColor = positionColors[position] ?? 'text-zinc-500'

  return (
    <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-600 transition-all">
      
      {/* Position */}
      <span className={`text-lg font-black w-6 text-center ${posColor}`}>
        {position}
      </span>

      {/* Driver code */}
      <span className="text-white font-black text-sm w-10 tracking-wider">
        {driver.driver_code}
      </span>

      {/* Driver name + team */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {driver.driver_name}
        </p>
        <p className="text-zinc-500 text-xs truncate">
          {driver.team}
        </p>
      </div>

      {/* Probability bar */}
      <div className="w-48">
        <ProbabilityBar
          probability={driver.win_probability}
          team={driver.team}
        />
      </div>

    </div>
  )
}