import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getWeekendPredictions, getUpcomingRace, getUserStats } from '../api/pitwall'
import { supabase } from '../lib/supabase'
import type { Prediction, UpcomingRace, UserStats } from '../types'
import SessionBadge from '../components/SessionBadge'
import F1Loader from '../components/F1loader'

const ROOKIES_2026 = [
  { code: 'ANT', name: 'Andrea Kimi Antonelli', team: 'Mercedes' },
  { code: 'HAD', name: 'Isack Hadjar', team: 'Red Bull' },
  { code: 'LIN', name: 'Arvid Lindblad', team: 'RB F1 Team' },
  { code: 'BOR', name: 'Gabriel Bortoleto', team: 'Audi' },
  { code: 'BEA', name: 'Oliver Bearman', team: 'Haas F1 Team' },
  { code: 'COL', name: 'Franco Colapinto', team: 'Alpine F1 Team' },
]

export default function MyPicks() {
  const { user } = useAuth()

  const [race, setRace] = useState<UpcomingRace | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1)

  const [p1Pick, setP1Pick] = useState('')
  const [p2Pick, setP2Pick] = useState('')
  const [p3Pick, setP3Pick] = useState('')
  const [rookiePick, setRookiePick] = useState('')
  const [existingPick, setExistingPick] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    Promise.all([
      getUpcomingRace(),
      getUserStats(user.id)
    ]).then(([r, s]) => {
      setRace(r)
      setStats(s)
      getWeekendPredictions(r.circuit, r.location)
        .then(setPrediction)
      // Check if user already submitted picks for this race
      supabase
        .from('user_picks')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', 2026)
        .eq('round', parseInt(r.round))
        .single()
        .then(({ data }) => {
          if (data) {
            setExistingPick(data)
            setP1Pick(data.p1_pick)
            setP2Pick(data.p2_pick)
            setP3Pick(data.p3_pick)
            setRookiePick(data.rookie_pick ?? '')
          }
        })
    }).finally(() => setLoading(false))
  }, [user])

  const handleSubmit = async () => {
    if (!user || !race || !p1Pick || !p2Pick || !p3Pick || !rookiePick) return
    if (p1Pick === p2Pick || p1Pick === p3Pick || p2Pick === p3Pick) {
      setError('Each position must have a different driver')
      return
    }

    setSubmitting(true)
    setError(null)

    const pickData = {
      user_id: user.id,
      race_name: race.name,
      year: 2026,
      round: parseInt(race.round),
      p1_pick: p1Pick,
      p2_pick: p2Pick,
      p3_pick: p3Pick,
      rookie_pick: rookiePick,
      is_locked: false
    }

    const { error: err } = existingPick
      ? await supabase.from('user_picks').update(pickData).eq('id', existingPick.id)
      : await supabase.from('user_picks').insert(pickData)

    if (err) {
      setError(err.message)
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  if (loading) return <F1Loader type={loaderType} />

  const drivers = prediction?.predictions ?? []
  const top3AI = drivers.slice(0, 3)

  const selectedDrivers = [p1Pick, p2Pick, p3Pick]

  const driverSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <div className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-red-500 rounded-xl p-4 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-2">{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={existingPick?.is_locked}
        className="w-full bg-transparent text-white font-bold text-lg outline-none cursor-pointer"
      >
        <option value="" className="bg-zinc-900">Select Driver</option>
        {drivers.map(d => (
          <option
            key={d.driver_code}
            value={d.driver_code}
            disabled={selectedDrivers.includes(d.driver_code) && d.driver_code !== value}
            className="bg-zinc-900"
          >
            {d.driver_code} — {d.driver_name}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="border-l-4 border-red-500 pl-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">
            2026 Season
          </span>
          <span className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
            Round {race?.round}
          </span>
        </div>
        <h1 className="text-5xl font-black text-white leading-none mb-2">
          My Picks
        </h1>
        <p className="text-zinc-400">{race?.name}</p>
      </div>

      {/* Profile Card */}
      {stats && (
        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <span className="text-red-500 font-black text-sm">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white font-black text-lg">
                    {user?.email?.split('@')[0]}
                  </p>
                  <p className="text-zinc-500 text-xs">{stats.tagline}</p>
                </div>
              </div>
            </div>
            {stats.streak > 0 && (
              <div className="text-right">
                <p className="text-red-500 font-black text-2xl">{stats.streak}</p>
                <p className="text-zinc-500 text-xs">race streak</p>
              </div>
            )}
          </div>

          {/* Points progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>Season Points</span>
              <span className="text-white font-bold">{stats.total_points} pts</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((stats.total_points / 200) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-zinc-800">
            {[
              { label: 'Total Points', value: stats.total_points },
              { label: 'Races Entered', value: stats.races_entered },
              { label: 'Avg Per Race', value: stats.avg_points || '—' },
              { label: 'Best Race', value: stats.best_race ? `${stats.best_race_points}pts` : '—' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-white font-black text-xl">{s.value}</p>
                <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Picks locked banner */}
      {existingPick?.is_locked && (
        <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4">
          <p className="text-yellow-400 text-sm font-bold">Picks Locked</p>
          <p className="text-zinc-400 text-xs mt-1">
            Qualifying has started — your picks are locked in. Check back after the race for your score!
          </p>
        </div>
      )}

      {/* AI vs User — side by side */}
      <div className="grid grid-cols-2 gap-6">

        {/* AI Prediction */}
        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
              PitWall AI Predicts
            </p>
            <div className="flex gap-1">
              {prediction?.sessions_used.map(s => (
                <SessionBadge key={s} session={s} />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {top3AI.map((driver, i) => (
              <div
                key={driver.driver_code}
                className="flex items-center gap-4 bg-zinc-900 rounded-xl px-4 py-3"
              >
                <span className="text-zinc-600 font-black text-lg w-6">P{i + 1}</span>
                <div className="flex-1">
                  <p className="text-white font-black tracking-wider">{driver.driver_code}</p>
                  <p className="text-zinc-500 text-xs">{driver.team}</p>
                </div>
                <span className="text-red-500 font-bold">{driver.win_probability}%</span>
              </div>
            ))}
          </div>
          {prediction?.session_count === 0 && (
            <p className="text-zinc-600 text-xs mt-4">
              Baseline prediction — updates after each session
            </p>
          )}
        </div>

        {/* User Picks */}
        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
          <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-4">
            Your Prediction
          </p>
          <div className="space-y-3">
            {driverSelect(p1Pick, setP1Pick, 'P1 — Race Winner')}
            {driverSelect(p2Pick, setP2Pick, 'P2 — Second Place')}
            {driverSelect(p3Pick, setP3Pick, 'P3 — Third Place')}
          </div>
        </div>

      </div>

      {/* Rookie Spotlight */}
      <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-1">
              Rookie Spotlight
            </p>
            <h3 className="text-white font-black text-xl">Top Rookie This Race?</h3>
            <p className="text-zinc-500 text-xs mt-1">
              AI doesn't predict this — it's all you
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-900 text-purple-300">
            Human Only
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {ROOKIES_2026.map(rookie => (
            <button
              key={rookie.code}
              onClick={() => !existingPick?.is_locked && setRookiePick(rookie.code)}
              disabled={existingPick?.is_locked}
              className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                rookiePick === rookie.code
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
              }`}
            >
              <p className="text-white font-black text-sm">{rookie.code}</p>
              <p className="text-zinc-500 text-xs truncate">{rookie.name}</p>
              <p className="text-zinc-600 text-xs">{rookie.team}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-red-900 bg-red-950 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      {!existingPick?.is_locked && (
        <button
          onClick={handleSubmit}
          disabled={submitting || !p1Pick || !p2Pick || !p3Pick || !rookiePick}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-xl transition-colors cursor-pointer"
        >
          {submitting
            ? 'Submitting...'
            : submitted
            ? 'Picks Saved!'
            : existingPick
            ? 'Update My Picks'
            : 'Submit My Picks'}
        </button>
      )}

      {submitted && (
        <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-4 text-center">
          <p className="text-green-400 font-bold">Picks submitted!</p>
          <p className="text-zinc-500 text-xs mt-1">
            Your picks are saved. Come back after the race to see your score!
          </p>
        </div>
      )}

    </div>
  )
}