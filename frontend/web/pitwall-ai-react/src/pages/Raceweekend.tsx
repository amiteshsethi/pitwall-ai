import { useEffect, useState } from "react"
import { getWeekendPredictions, getUpcomingRace } from "../api/pitwall"
import type { Prediction, UpcomingRace } from "../types"
import DriverCard from "../components/DriverCard"
import SessionBadge from "../components/SessionBadge"
import F1Loader from "../components/F1loader"
import TrackVisual from "../components/TrackVisual"
import { useNavigate } from "react-router-dom"
import PageHeader from "../components/ui/PageHeader"
import Section from "../components/ui/Section"
import ListRow from "../components/ui/ListRow"
import Button from "../components/ui/Button"
import { STATUS_COLORS } from "../lib/theme"

export default function RaceWeekend() {
  const navigate = useNavigate()
  const [race, setRace] = useState<UpcomingRace | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1)
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    if (!race) return
    const calculate = () => {
      const diff = new Date(`${race.date}T${race.time}`).getTime() - Date.now()
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      }
    }
    setTimeLeft(calculate())
    const timer = setInterval(() => setTimeLeft(calculate()), 1000)
    return () => clearInterval(timer)
  }, [race])

  const fetchPredictions = (track: string, location: string) => {
    setLoading(true)
    getWeekendPredictions(track, location)
      .then((data) => {
        setPrediction(data)
        setLastUpdated(new Date())
        setError(null)
      })
      .catch(() =>
        setError(
          "Failed to fetch predictions. Please try again later or check your internet connection.",
        ),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    getUpcomingRace()
      .then((data) => {
        setRace(data)
        fetchPredictions(data.circuit, data.location)
      })
      .catch(() => setError("Failed to fetch upcoming race."))
  }, [])

  if (!race) return <F1Loader type={loaderType} />

  const drivers = prediction?.predictions ?? []
  const maxProbability = drivers[0]?.win_probability ?? 100

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          eyebrow="Race Weekend"
          title={race.name}
          subtitle={`${race.circuit} · Round ${race.round} · ${race.country}`}
        />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {[
            { label: "D", value: timeLeft.days },
            { label: "H", value: timeLeft.hours },
            { label: "M", value: timeLeft.minutes },
            { label: "S", value: timeLeft.seconds },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg px-2 py-1 text-center min-w-[42px]"
              style={{ backgroundColor: "#0d0d0d", border: "1px solid #18181b" }}
            >
              <p className="text-red-500 font-black text-lg tabular-nums leading-none">
                {String(value).padStart(2, "0")}
              </p>
              <p className="text-zinc-600 text-[10px] tracking-widest">{label}</p>
            </div>
          ))}
          <button
            onClick={() => fetchPredictions(race.circuit, race.location)}
            className="border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-red-500 text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      <TrackVisual circuitName={race.circuit} />

      {error && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{
            backgroundColor: STATUS_COLORS.error.bg,
            border: `1px solid ${STATUS_COLORS.error.border}`,
            color: STATUS_COLORS.error.text,
          }}
        >
          {error}
        </div>
      )}

      {loading && <F1Loader type={loaderType} />}

      {!loading && prediction && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section divider={false} padding={false}>
              <div
                className="p-4 sm:p-6 rounded-2xl"
                style={{ backgroundColor: "#090909", border: "1px solid #18181b" }}
              >
                <p className="label-eyebrow mb-6">Predicted Podium</p>
                <div className="space-y-2">
                  {prediction.predictions.slice(0, 3).map((driver, i) => (
                    <ListRow
                      key={driver.driver_code}
                      position={`P${i + 1}`}
                      team={driver.team}
                      title={driver.driver_code}
                      subtitle={driver.team}
                      trailing={
                        <span className="text-red-500 font-black text-lg sm:text-xl">
                          {driver.win_probability}%
                        </span>
                      }
                    />
                  ))}
                </div>
                <Button
                  onClick={() => navigate("/picks")}
                  className="w-full mt-4 text-sm"
                >
                  Can you beat the AI?
                </Button>
              </div>
            </Section>

            <Section divider={false} padding={false}>
              <div
                className="p-4 sm:p-6 rounded-2xl"
                style={{ backgroundColor: "#090909", border: "1px solid #18181b" }}
              >
                <p className="label-eyebrow mb-4">Prediction Based On</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {prediction.session_count > 0
                    ? prediction.sessions_used.map((session) => (
                        <SessionBadge key={session} session={session} />
                      ))
                    : ["Car Performance", "Driver Skill", "Points Momentum", "Track History"].map(
                        (factor) => (
                          <span
                            key={factor}
                            className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                            style={{
                              backgroundColor: "#18181b",
                              color: "#a1a1aa",
                            }}
                          >
                            {factor}
                          </span>
                        ),
                      )}
                </div>

                {prediction.session_count === 0 && (
                  <div
                    className="rounded-xl p-4 mb-4"
                    style={{
                      backgroundColor: STATUS_COLORS.warning.bg,
                      border: `1px solid ${STATUS_COLORS.warning.border}`,
                    }}
                  >
                    <p
                      className="text-sm font-bold mb-1"
                      style={{ color: STATUS_COLORS.warning.text }}
                    >
                      Pre-weekend baseline prediction
                    </p>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Based on car performance, driver skill ratings and championship standings.
                      Updates automatically after each session.
                    </p>
                  </div>
                )}

                {prediction.session_count > 0 && prediction.session_count < 4 && (
                  <div
                    className="rounded-xl p-4 mb-4"
                    style={{
                      backgroundColor: STATUS_COLORS.info.bg,
                      border: `1px solid ${STATUS_COLORS.info.border}`,
                    }}
                  >
                    <p
                      className="text-sm font-bold mb-1"
                      style={{ color: STATUS_COLORS.info.text }}
                    >
                      Prediction updating
                    </p>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Using data from {prediction.session_count} session
                      {prediction.session_count > 1 ? "s" : ""} so far.
                    </p>
                  </div>
                )}

                {prediction.sessions_used.includes("Qualifying") && (
                  <div
                    className="rounded-xl p-4 mb-4"
                    style={{
                      backgroundColor: STATUS_COLORS.success.bg,
                      border: `1px solid ${STATUS_COLORS.success.border}`,
                    }}
                  >
                    <p
                      className="text-sm font-bold mb-1"
                      style={{ color: STATUS_COLORS.success.text }}
                    >
                      Final pre-race prediction locked
                    </p>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      Qualifying data included. Most accurate prediction for this weekend.
                    </p>
                  </div>
                )}

                <div className="section-divider pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Sessions used</span>
                    <span className="text-white font-semibold">{prediction.session_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Last updated</span>
                    <span className="text-white font-semibold">
                      {lastUpdated?.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Country</span>
                    <span className="text-white font-semibold">{race.country}</span>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <Section divider={false} padding={false}>
            <div
              className="p-4 sm:p-6 rounded-2xl"
              style={{ backgroundColor: "#090909", border: "1px solid #18181b" }}
            >
              <p className="label-eyebrow mb-4">Full Grid Predictions</p>
              <div className="space-y-2">
                {prediction.predictions.map((driver, i) => (
                  <DriverCard
                    key={driver.driver_code}
                    driver={driver}
                    position={i + 1}
                    maxProbability={maxProbability}
                  />
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
