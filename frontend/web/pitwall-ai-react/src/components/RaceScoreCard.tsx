import type { RaceScore, ScoreBreakdownItem } from "../types"

export default function RaceScoreCard({ score }: { score: RaceScore }) {
  const driverPicks = score.breakdown.filter(b =>
    ['correct', 'podium', 'wrong'].includes(b.result)
  )
  const rookiePick = score.breakdown.find(b =>
    b.result === 'rookie_wrong' || b.result === 'rookie_correct'
  )
  const podiumActuals = [score.actual_p1, score.actual_p2, score.actual_p3]
  const posLabels = ['Your P1 pick', 'Your P2 pick', 'Your P3 pick']

  const cellStyle = (result: string) => {
    if (result === 'correct') return 'bg-green-500/10 border-r border-zinc-800'
    if (result === 'podium') return 'bg-yellow-500/10 border-r border-zinc-800'
    return 'bg-zinc-900 border-r border-zinc-800'
  }

  const badgeStyle = (result: string) => {
    if (result === 'correct') return 'bg-green-500/20 text-green-400'
    if (result === 'podium') return 'bg-yellow-500/20 text-yellow-400'
    return 'bg-zinc-800 text-zinc-500'
  }

  const driverColor = (result: string) => {
    if (result === 'correct') return 'text-green-400'
    if (result === 'podium') return 'text-yellow-400'
    return 'text-white'
  }

  const badgeLabel = (item: ScoreBreakdownItem) => {
    if (item.result === 'correct') return `correct · +${item.points}pts`
    if (item.result === 'podium') return `on podium · +${item.points}pts`
    return 'missed · +0pts'
  }

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-800">
        <div>
          <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-1">
            Round {score.round}
          </p>
          <p className="text-white font-black text-lg leading-none">{score.race_name}</p>
          <p className="text-zinc-500 text-xs mt-1.5">
            Actual podium: {score.actual_p1} · {score.actual_p2} · {score.actual_p3}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-red-500">{score.total_points}</p>
          <p className="text-zinc-500 text-xs">pts this race</p>
        </div>
      </div>

      {/* Pick cells */}
      <div className="grid grid-cols-3 divide-x divide-zinc-800">
        {driverPicks.map((item, i) => (
          <div key={i} className={`px-4 py-3 ${cellStyle(item.result)}`}>
            <p className="text-zinc-500 text-xs mb-2">{posLabels[i]}</p>
            <p className={`font-black text-lg leading-none ${driverColor(item.result)}`}>
              {item.pick}
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              Actual: {podiumActuals[i]}
            </p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-2 ${badgeStyle(item.result)}`}>
              {badgeLabel(item)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="grid grid-cols-4 divide-x divide-zinc-800 border-t border-zinc-800">
        <div className="px-4 py-3 text-center">
          <p className="text-white font-black text-lg">{score.driver_points}</p>
          <p className="text-zinc-500 text-xs mt-0.5">Driver pts</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-white font-black text-lg">{score.constructor_points}</p>
          <p className="text-zinc-500 text-xs mt-0.5">Constructor pts</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-purple-400 font-black text-lg">{score.rookie_points}</p>
          <p className="text-zinc-500 text-xs mt-0.5">Rookie pts</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className={`font-black text-lg ${rookiePick?.result === 'rookie_correct' ? 'text-purple-400' : 'text-zinc-400'}`}>
            {rookiePick?.pick ?? '—'}
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">Rookie pick</p>
        </div>
      </div>
    </div>
  )
}