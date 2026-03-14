import { useEffect, useState } from 'react'
import { getDriverStandings, getConstructorStandings } from '../api/pitwall'
import type { DriverStanding, ConstructorStanding } from '../types'
import F1Loader from '../components/F1loader'

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

type Tab = 'drivers' | 'constructors'

export default function Standings() {
  const [tab, setTab] = useState<Tab>('drivers')
  const [drivers, setDrivers] = useState<DriverStanding[]>([])
  const [constructors, setConstructors] = useState<ConstructorStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDriverStandings(),
      getConstructorStandings()
    ])
      .then(([d, c]) => {
        setDrivers(d)
        setConstructors(c)
      })
      .finally(() => setLoading(false))
  }, [])

  const maxDriverPoints = drivers[0]?.points ?? 1
  const maxConstructorPoints = constructors[0]?.points ?? 1

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="border-l-4 border-red-500 pl-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">
            2026 Season
          </span>
        </div>
        <h1 className="text-6xl font-black text-white leading-none mb-2">
  {tab === 'drivers' ? 'World Driver\'s Championship' : 'World Constructor\'s Championship'}
</h1> 
        <p className="text-zinc-400 text-lg">Live standings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-0">
        {(['drivers', 'constructors'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-semibold tracking-widest uppercase transition-all duration-200 border-b-2 -mb-px cursor-pointer ${
              tab === t
                ? 'border-red-500 text-red-500'
                : 'border-transparent text-zinc-500 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Loader */}
      {loading && <F1Loader type={loaderType} />}

      {/* Driver Standings */}
      {!loading && tab === 'drivers' && (
        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950 space-y-2">
          {drivers.map((driver, i) => (
            <div
              key={driver.driver}
              className="group relative overflow-hidden flex items-center gap-4 bg-zinc-900 border border-zinc-800 hover:border-red-500 rounded-xl px-4 py-3 transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Position */}
              <span className={`text-lg font-black w-6 text-center ${
  i === 0 ? 'text-yellow-400' :
  i === 1 ? 'text-zinc-300' :
  i === 2 ? 'text-amber-600' : 'text-zinc-500'
}`}>
  {i === 0 ? (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-yellow-400 mx-auto">
      <path d="M12 2C9 2 7 4 7 7H5C4 7 3 8 3 9v1c0 2 1.5 3.5 3.5 4A5 5 0 0 0 11 17v2H8v2h8v-2h-3v-2a5 5 0 0 0 4.5-3C19.5 13.5 21 12 21 10V9c0-1-1-2-2-2h-2c0-3-2-5-5-5z"/>
    </svg>
  ) : driver.position ?? '-'}
</span>
              {/* <span className={`text-lg font-black w-6 text-center ${
                i === 0 ? 'text-yellow-400' :
                i === 1 ? 'text-zinc-300' :
                i === 2 ? 'text-amber-600' : 'text-zinc-500'
              }`}>
                {driver.position ?? '-'}
              </span> */}

              {/* Team color bar */}
              {/* <div className={`w-2 h-6 rounded-full flex-shrink-0 ${teamColors[driver.team] ?? 'bg-zinc-600'}`} /> */}
              <div className={`w-1 h-8 rounded-full flex-shrink-0 ${teamColors[driver.team] ?? 'bg-zinc-600'}`} />

              {/* Driver info */}
              <div className="w-14">
                <p className="text-white font-black text-sm tracking-wider">
                  {driver.driver}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {driver.driver_name}
                </p>
                <p className="text-zinc-500 text-xs truncate">{driver.team}</p>
              </div>

              {/* Points bar */}
              <div className="w-48 flex items-center gap-3">
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${teamColors[driver.team] ?? 'bg-zinc-400'}`}
                    style={{ width: `${(driver.points / maxDriverPoints) * 100}%` }}
                  />
                </div>
                <span className="text-white font-black text-sm w-10 text-right">
                  {driver.points}
                </span>
              </div>

              <span className="text-zinc-500 text-xs w-16 text-right">
                {i === 0 ? 'LEADER' : `+${(maxDriverPoints - driver.points).toFixed(0)}`}
              </span>

              {/* Wins */}
              {driver.wins > 0 && (
                <span className="text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded-full">
                  {driver.wins}W
                </span>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Constructor Standings */}
      {!loading && tab === 'constructors' && (
        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950 space-y-2">
          {constructors.map((constructor, i) => (
            <div
              key={constructor.team}
              className="group relative overflow-hidden flex items-center gap-4 bg-zinc-900 border border-zinc-800 hover:border-red-500 rounded-xl px-4 py-3 transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Position */}
              <span className={`text-lg font-black w-6 text-center ${
                i === 0 ? 'text-yellow-400' :
                i === 1 ? 'text-zinc-300' :
                i === 2 ? 'text-amber-600' : 'text-zinc-500'
              }`}>
                {i + 1}
              </span>

              {/* Team color bar */}
              <div className={`w-1 h-8 rounded-full flex-shrink-0 ${teamColors[constructor.team] ?? 'bg-zinc-600'}`} />

              {/* Team name */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">
                  {constructor.team}
                </p>
              </div>

              {/* Points bar */}
              <div className="w-48 flex items-center gap-3">
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${teamColors[constructor.team] ?? 'bg-zinc-400'}`}
                    style={{ width: `${(constructor.points / maxConstructorPoints) * 100}%` }}
                  />
                </div>
                <span className="text-white font-black text-sm w-10 text-right">
                  {constructor.points}
                </span>
              </div>

              {/* Wins */}
              {constructor.wins > 0 && (
                <span className="text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded-full">
                  {constructor.wins}W
                </span>
              )}

            </div>
          ))}
        </div>
      )}

    </div>
  )
}