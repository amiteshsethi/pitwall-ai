interface ProbabilityBarProps {
  probability: number
  team: string
}

const teamColors: Record<string, string> = {
  'Mercedes': 'bg-teal-400',
  'Ferrari': 'bg-red-500',
  'McLaren': 'bg-orange-400',
  'Red Bull': 'bg-blue-500',
  'Aston Martin': 'bg-green-500',
  'Alpine F1 Team': 'bg-pink-500',
  'Williams': 'bg-sky-400',
  'Haas F1 Team': 'bg-gray-400',
  'RB F1 Team': 'bg-indigo-400',
  'Audi': 'bg-gray-300',
  'Cadillac F1 Team': 'bg-yellow-400',
}

export default function ProbabilityBar({ probability, team }: ProbabilityBarProps) {
  const color = teamColors[team] ?? 'bg-zinc-400'
  const width = Math.max(probability * 10, 2)

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 bg-zinc-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-sm font-bold text-white w-12 text-right">
        {probability}%
      </span>
    </div>
  )
}