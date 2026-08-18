import { useEffect, useState } from "react"
import { useAuth } from "../hooks/useAuth"
import {
  getWeekendPredictions,
  getUpcomingRace,
  getUserStats,
  createUserPicks,
  updateUserPicks,
  getUserPicks,
  getUserScores,
} from "../api/pitwall"
import SessionBadge from "../components/SessionBadge"
import F1Loader from "../components/F1loader"
import RaceScoreCard from "../components/RaceScoreCard"
import type { RaceScore } from "../types"
import { useQuery } from "@tanstack/react-query"
import PageHeader from "../components/ui/PageHeader"
import Section from "../components/ui/Section"
import ListRow from "../components/ui/ListRow"
import Button from "../components/ui/Button"
import { STATUS_COLORS } from "../lib/theme"

const ROOKIES_2026 = [
  { code: "ANT", name: "Andrea Kimi Antonelli", team: "Mercedes" },
  { code: "HAD", name: "Isack Hadjar", team: "Red Bull" },
  { code: "LIN", name: "Arvid Lindblad", team: "RB F1 Team" },
  { code: "BOR", name: "Gabriel Bortoleto", team: "Audi" },
  { code: "BEA", name: "Oliver Bearman", team: "Haas F1 Team" },
  { code: "COL", name: "Franco Colapinto", team: "Alpine F1 Team" },
]

type PickPos = "p1" | "p2" | "p3"

export default function MyPicks() {
  const { user } = useAuth()
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1)
  const [p1Pick, setP1Pick] = useState("")
  const [p2Pick, setP2Pick] = useState("")
  const [p3Pick, setP3Pick] = useState("")
  const [rookiePick, setRookiePick] = useState("")
  const [existingPick, setExistingPick] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePickPos, setActivePickPos] = useState<PickPos | null>(null)

  const { data: race, isLoading: raceLoading } = useQuery({
    queryKey: ["upcoming-race"],
    queryFn: getUpcomingRace,
    staleTime: 10 * 60 * 1000,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: () => getUserStats(user!.id),
    enabled: !!user,
  })

  const { data: prediction, isLoading: predictionsLoading } = useQuery({
    queryKey: ["predictions", race?.circuit, race?.location],
    queryFn: () => getWeekendPredictions(race!.circuit, race!.location),
    enabled: !!race,
  })

  const { data: scores = [] } = useQuery({
    queryKey: ["user-scores", user?.id],
    queryFn: () => getUserScores(user!.id),
    enabled: !!user,
  })

  const { data: picksData } = useQuery({
    queryKey: ["user-picks", user?.id, race?.round],
    queryFn: () => getUserPicks(user!.id, parseInt(race!.round)),
    enabled: !!user && !!race,
  })

  useEffect(() => {
    if (picksData?.exists) {
      setExistingPick(picksData)
      setP1Pick(picksData.p1_pick ?? "")
      setP2Pick(picksData.p2_pick ?? "")
      setP3Pick(picksData.p3_pick ?? "")
      setRookiePick(picksData.rookie_pick ?? "")
    }
  }, [picksData])

  const isRaceWeek = race?.date
    ? new Date() >= new Date(new Date(race.date).getTime() - 7 * 24 * 60 * 60 * 1000)
    : false

  const isLocked =
    existingPick?.is_locked ||
    (prediction?.sessions_used?.includes("Qualifying") ?? false)

  const getPickValue = (pos: PickPos) =>
    pos === "p1" ? p1Pick : pos === "p2" ? p2Pick : p3Pick

  const setPickValue = (pos: PickPos, value: string) => {
    if (pos === "p1") setP1Pick(value)
    else if (pos === "p2") setP2Pick(value)
    else setP3Pick(value)
    setActivePickPos(null)
  }

  const selectedDrivers = [p1Pick, p2Pick, p3Pick]

  const handleSubmit = async () => {
    if (!user || !race || !p1Pick || !p2Pick || !p3Pick || !rookiePick) return

    if (p1Pick === p2Pick || p1Pick === p3Pick || p2Pick === p3Pick) {
      setError("Each position must have a different driver")
      return
    }

    setSubmitting(true)
    setError(null)

    const pickData = {
      p1_pick: p1Pick,
      p2_pick: p2Pick,
      p3_pick: p3Pick,
      rookie_pick: rookiePick,
    }

    try {
      if (existingPick) {
        await updateUserPicks(user.id, parseInt(race.round), pickData)
      } else {
        await createUserPicks(user.id, parseInt(race.round), pickData)
      }

      setExistingPick((prev: any) => ({
        ...(prev || {}),
        ...pickData,
        is_locked: false,
      }))

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit picks")
    } finally {
      setSubmitting(false)
    }
  }

  function daysUntil(dateStr: string) {
    return Math.ceil(
      (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    )
  }

  if (raceLoading || statsLoading || predictionsLoading)
    return <F1Loader type={loaderType} />

  const drivers = prediction?.predictions ?? []
  const top3AI = drivers.slice(0, 3)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`2026 Season · Round ${race?.round ?? "—"}`}
        title="Prediction"
        accent="Centre"
        subtitle="Your picks, scores & AI predictions"
      />

      {stats && (
        <div
          className="rounded-2xl p-4 sm:p-6"
          style={{ backgroundColor: "#090909", border: "1px solid #18181b" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#1c0505", border: "1px solid #7f1d1d" }}
              >
                <span className="text-red-500 font-black text-base">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-white font-black text-base">{user?.email?.split("@")[0]}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{stats.tagline}</p>
              </div>
            </div>
            {stats.streak > 0 && (
              <div className="text-right">
                <p className="text-red-500 font-black text-2xl">{stats.streak}</p>
                <p className="text-zinc-600 text-[10px]">race streak</p>
              </div>
            )}
          </div>

          <div className="flex justify-between mb-1 text-xs text-zinc-600">
            <span>Season points</span>
            <span className="text-white font-bold">{stats.total_points} pts</span>
          </div>
          <div
            className="rounded-sm mb-4 overflow-hidden"
            style={{ height: 2, backgroundColor: "#27272a" }}
          >
            <div
              style={{
                height: 2,
                width: `${Math.min((stats.total_points / 200) * 100, 100)}%`,
                backgroundColor: "#ef4444",
              }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 section-divider pt-4">
            {[
              { label: "Total", value: stats.total_points },
              { label: "Races", value: stats.races_entered },
              { label: "Avg", value: stats.avg_points || "—" },
              { label: "Best", value: stats.best_race ? `${stats.best_race_points}p` : "—" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-white font-black text-lg">{s.value}</p>
                <p className="text-zinc-600 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {race && (
        <Section>
          <p className="label-eyebrow mb-3">Next race</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-white font-black text-xl">{race.name}</p>
              <p className="text-zinc-500 text-sm mt-1">
                {race.circuit} · Round {race.round}
              </p>
            </div>
            {race.date && !isRaceWeek && (
              <div className="text-left sm:text-right">
                <p className="text-red-500 font-black text-3xl">{daysUntil(race.date)}</p>
                <p className="text-zinc-500 text-xs">days away</p>
              </div>
            )}
            {isRaceWeek && (
              <span
                className="inline-flex text-xs font-bold px-3 py-1 rounded-full w-fit"
                style={{
                  backgroundColor: STATUS_COLORS.success.bg,
                  border: `1px solid ${STATUS_COLORS.success.border}`,
                  color: STATUS_COLORS.success.text,
                }}
              >
                Race Week
              </span>
            )}
          </div>
        </Section>
      )}

      {!isRaceWeek ? (
        <div
          className="rounded-2xl p-4"
          style={{
            backgroundColor: STATUS_COLORS.warning.bg,
            border: `1px solid ${STATUS_COLORS.warning.border}`,
          }}
        >
          <p className="font-black text-sm mb-1" style={{ color: STATUS_COLORS.warning.text }}>
            Picks Open Race Week
          </p>
          <p className="text-zinc-400 text-xs">
            Predictions for {race?.name} open 7 days before race. Check back then.
          </p>
        </div>
      ) : (
        <>
          {isLocked && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: STATUS_COLORS.warning.bg,
                border: `1px solid ${STATUS_COLORS.warning.border}`,
              }}
            >
              <p className="text-sm font-black mb-0.5" style={{ color: STATUS_COLORS.warning.text }}>
                Picks Locked
              </p>
              <p className="text-zinc-400 text-xs">
                Qualifying done — check back after the race for your score!
              </p>
            </div>
          )}

          <Section>
            <p className="label-eyebrow mb-4">AI vs Your Prediction</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-zinc-600 text-xs font-semibold uppercase tracking-wider">
                    PitWall AI Predicts
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {prediction?.sessions_used.map((s) => (
                      <SessionBadge key={s} session={s} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {top3AI.map((driver, i) => (
                    <ListRow
                      key={driver.driver_code}
                      position={`P${i + 1}`}
                      team={driver.team}
                      title={driver.driver_code}
                      subtitle={driver.team}
                      trailing={
                        <span className="text-red-500 font-bold text-sm">
                          {driver.win_probability}%
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-zinc-600 text-xs font-semibold uppercase tracking-wider mb-3">
                  Your Prediction
                </p>
                <div className="space-y-2">
                  {(["p1", "p2", "p3"] as PickPos[]).map((pos, i) => {
                    const value = getPickValue(pos)
                    const isActive = activePickPos === pos
                    return (
                      <div key={pos}>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => setActivePickPos(isActive ? null : pos)}
                          className="w-full flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors cursor-pointer disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: isActive ? "#1c0505" : "#0d0d0d",
                            border: `1px solid ${isActive ? "#ef4444" : value ? "#27272a" : "#18181b"}`,
                          }}
                        >
                          <span className="text-zinc-600 font-black text-xs w-5">P{i + 1}</span>
                          <span
                            className="flex-1 font-black text-sm tracking-wider"
                            style={{ color: value ? "#ffffff" : "#52525b" }}
                          >
                            {value || "Tap to select"}
                          </span>
                          <span style={{ color: isActive ? "#ef4444" : "#52525b" }}>
                            {isActive ? "▲" : "▼"}
                          </span>
                        </button>

                        {isActive && !isLocked && (
                          <div
                            className="mt-2 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                            style={{ border: "1px solid #27272a" }}
                          >
                            {drivers.map((d) => {
                              const taken =
                                selectedDrivers.includes(d.driver_code) &&
                                d.driver_code !== value
                              return (
                                <button
                                  key={d.driver_code}
                                  type="button"
                                  disabled={taken}
                                  onClick={() => setPickValue(pos, d.driver_code)}
                                  className="w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#18181b]"
                                  style={{ backgroundColor: "#0d0d0d" }}
                                >
                                  <span className="text-white font-bold">{d.driver_code}</span>
                                  <span className="text-zinc-500 text-xs ml-2">
                                    {d.driver_name}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Section>

          <Section>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <p className="label-eyebrow mb-1">Rookie Spotlight</p>
                <h3 className="text-white font-black text-xl">Top Rookie This Race?</h3>
                <p className="text-zinc-500 text-xs mt-1">AI doesn't predict this — it's all you</p>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider w-fit bg-purple-900 text-purple-300">
                Human Only
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ROOKIES_2026.map((rookie) => (
                <button
                  key={rookie.code}
                  type="button"
                  onClick={() => !isLocked && setRookiePick(rookie.code)}
                  disabled={isLocked}
                  className="p-3 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: rookiePick === rookie.code ? "#1c0505" : "#0d0d0d",
                    borderColor: rookiePick === rookie.code ? "#ef4444" : "#18181b",
                  }}
                >
                  <p className="text-white font-black text-sm">{rookie.code}</p>
                  <p className="text-zinc-500 text-xs truncate">{rookie.name}</p>
                  <p className="text-zinc-600 text-xs">{rookie.team}</p>
                </button>
              ))}
            </div>
          </Section>

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

          {isLocked ? (
            existingPick ? (
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  backgroundColor: STATUS_COLORS.success.bg,
                  border: `1px solid ${STATUS_COLORS.success.border}`,
                }}
              >
                <p className="font-black text-lg mb-1" style={{ color: STATUS_COLORS.success.text }}>
                  Your Picks Are Locked In
                </p>
                <div className="flex flex-wrap justify-center gap-6 sm:gap-8 mt-4">
                  {[
                    { label: "P1 Pick", value: existingPick.p1_pick },
                    { label: "P2 Pick", value: existingPick.p2_pick },
                    { label: "P3 Pick", value: existingPick.p3_pick },
                    { label: "Rookie Pick", value: existingPick.rookie_pick, purple: true },
                  ].map((p) => (
                    <div key={p.label}>
                      <p className={`font-black text-xl ${p.purple ? "text-purple-400" : "text-white"}`}>
                        {p.value}
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">{p.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  backgroundColor: STATUS_COLORS.error.bg,
                  border: `1px solid ${STATUS_COLORS.error.border}`,
                }}
              >
                <p className="font-black text-lg mb-1" style={{ color: STATUS_COLORS.error.text }}>
                  Picks Closed
                </p>
                <p className="text-zinc-400 text-sm">
                  Qualifying has finished — picks are no longer accepted for this race.
                </p>
              </div>
            )
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !p1Pick || !p2Pick || !p3Pick || !rookiePick}
              className="w-full"
            >
              {submitting
                ? "Submitting..."
                : submitted
                  ? "Picks Saved!"
                  : existingPick
                    ? "Update My Picks"
                    : "Submit My Picks"}
            </Button>
          )}

          {submitted && !isLocked && (
            <div
              className="rounded-xl p-4 text-center"
              style={{
                backgroundColor: STATUS_COLORS.success.bg,
                border: `1px solid ${STATUS_COLORS.success.border}`,
              }}
            >
              <p className="font-bold" style={{ color: STATUS_COLORS.success.text }}>
                Picks submitted!
              </p>
            </div>
          )}
        </>
      )}

      {scores.length > 0 && (
        <div className="space-y-4">
          <p className="label-eyebrow">Previous races</p>
          {scores.map((score: RaceScore) => (
            <RaceScoreCard key={score.id} score={score} />
          ))}
        </div>
      )}
    </div>
  )
}
