/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import {
  getUpcomingRace,
  getPredictionComparison,
  getUserPicks,
  getUserScoreForRound,
} from "../api/pitwall"
import type { UpcomingRace, PredictionComparison } from "../types"
import F1Loader from "../components/F1loader"
import { useCountdown } from "../hooks/customhooks"
import { useAuth } from "../hooks/useAuth"
import AnimatedGlobe from "../components/AnimatedGlobe"
import ProcessingBanner from "../components/ProcessingBanner"
import Section from "../components/ui/Section"
import Button from "../components/ui/Button"
import ListRow from "../components/ui/ListRow"
import { ENABLE_FULLPAGE_GLOBE } from "../config/features"

function isIndexingGap(upcomingRound?: string, comparisonRound?: number): boolean {
  if (!upcomingRound || !comparisonRound) return false
  return parseInt(upcomingRound) - comparisonRound > 1
}

export default function Home() {
  const { user } = useAuth()
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1)

  const { data: race, isLoading: raceLoading } = useQuery<UpcomingRace>({
    queryKey: ["upcoming-race"],
    queryFn: getUpcomingRace,
    staleTime: 10 * 60 * 1000,
  })

  const { data: comparison } = useQuery<PredictionComparison>({
    queryKey: ["comparison"],
    queryFn: getPredictionComparison,
    staleTime: 10 * 60 * 1000,
  })

  const { data: userPicksData } = useQuery({
    queryKey: ["user-picks", user?.id, race?.round],
    queryFn: () => getUserPicks(user!.id, parseInt(race!.round)),
    enabled: !!user && !!race,
    staleTime: 5 * 60 * 1000,
  })

  const { data: userScore } = useQuery({
    queryKey: ["user-score-last", user?.id, (comparison as any)?.round],
    queryFn: () => getUserScoreForRound(user!.id, (comparison as any).round),
    enabled: !!user && !!(comparison as any)?.round,
    staleTime: 10 * 60 * 1000,
    select: (data) => (data?.exists ? data.score : null),
  })

  const timeLeft = useCountdown(race?.date ?? null, race?.time ?? null)
  const userHasPicks = userPicksData?.exists ?? false

  const inGap = isIndexingGap(race?.round, (comparison as any)?.round)
  const upcomingRound = race?.round ? parseInt(race.round) : undefined
  const justFinishedLabel = inGap && upcomingRound ? `Round ${upcomingRound - 1}` : null

  return (
    <div className="space-y-2">
      {/* Brand header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white text-3xl sm:text-4xl font-black tracking-tight">PITWALL</p>
            <p className="text-red-500 text-3xl sm:text-4xl font-black -mt-1">AI</p>
            <p className="text-zinc-500 mt-3 text-xs uppercase tracking-[0.3em]">
              Formula One Intelligence
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
              <span className="text-red-500 text-[10px] font-bold tracking-[0.2em] uppercase">
                LIVE
              </span>
            </div>
            <p className="text-zinc-500 text-[11px] mt-2">2026 Season</p>
            {race?.round && (
              <p className="text-white font-bold text-sm">Round {race.round}</p>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div
        className="relative rounded overflow-hidden mb-6 sm:mb-8"
        style={{
          backgroundColor: "#090909",
          border: "1px solid #18181b",
          minHeight: ENABLE_FULLPAGE_GLOBE ? undefined : 380,
        }}
      >
        {!ENABLE_FULLPAGE_GLOBE && (
          <>
            <div
              className="pointer-events-none absolute opacity-90 hidden sm:block"
              style={{ right: "-15%", top: "-15%" }}
            >
              <AnimatedGlobe size={480} />
            </div>
            <div
              className="pointer-events-none absolute opacity-60 sm:hidden"
              style={{ right: "-30%", top: "-10%" }}
            >
              <AnimatedGlobe size={280} />
            </div>
          </>
        )}

        <div className="relative p-2 sm:p-[7px]">
          <p className="label-eyebrow">Formula One Prediction Engine</p>
          <h1 className="text-white font-black text-3xl sm:text-5xl lg:text-[46px] leading-tight mt-4 sm:mt-5">
            Your
          </h1>
          <h1 className="text-white font-black text-3xl sm:text-5xl lg:text-[46px] leading-tight">
            Pitwall
          </h1>
          <h1 className="text-red-500 font-black text-3xl sm:text-5xl lg:text-[46px] leading-tight">
            Super AI.
          </h1>
          <p className="text-zinc-400 mt-6 sm:mt-8 text-sm leading-relaxed max-w-md">
            AI powered Formula One predictions built using telemetry, qualifying pace,
            race simulations and historical data.
          </p>
          <div className="mt-8 sm:mt-10 pb-2">
            <Button to="/race" className="w-full sm:w-auto text-center">
              View Race Predictions
            </Button>
          </div>
        </div>
      </div>

      {raceLoading && <F1Loader type={loaderType} />}

      {!raceLoading && (
        <>
          {inGap && justFinishedLabel && <ProcessingBanner raceName={justFinishedLabel} />}

          {/* Challenge */}
          <div
            className="rounded-2xl mb-6 sm:mb-8 p-2 sm:p-[7px]"
            style={{ backgroundColor: "#090909", border: "1px solid rgba(239, 68, 68, 0.3)" }}
          >
            <p className="text-red-500 text-[10px] font-bold tracking-widest uppercase mb-1">
              New Challenge
            </p>
            <h2 className="text-white text-lg sm:text-xl font-black mb-2">
              Can You Beat the F1-AI?
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-4">
              PitWall AI predicted the correct constructor for every podium position in the
              last GP. Think you can do better?
            </p>
            <div className="mb-2">
              {user ? (
                <Button to="/picks" className="w-full text-sm">
                  {userHasPicks ? "View My Picks" : "Submit Picks"}
                </Button>
              ) : (
                <Button to="/login" className="w-full text-sm">
                  Sign In to Predict
                </Button>
              )}
              {user && (
                <p className="text-zinc-500 text-[10px] text-center mt-1.5 font-semibold uppercase tracking-wider">
                  {userHasPicks
                    ? "Picks submitted for this race"
                    : `Logged in as ${user.email?.split("@")[0]}`}
                </p>
              )}
            </div>

            <div className="section-divider pt-4 mt-4 space-y-3">
              {inGap ? (
                <>
                  <div>
                    <p className="text-xl font-black text-amber-500">—</p>
                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                      AI accuracy · results pending
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-xs">
                      Last confirmed: {comparison?.race_name ?? "—"}
                    </p>
                    <p className="text-zinc-600 text-[10px] mt-0.5">
                      Most recent race indexing in progress
                    </p>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: `AI constructor accuracy · ${comparison?.race_name ?? "Last race"}`,
                      value: `${comparison?.constructor_correct_count ?? "?"}/${comparison?.total ?? 3}`,
                    },
                    {
                      label: `AI driver accuracy · ${comparison?.race_name ?? "Last race"}`,
                      value: `${comparison?.driver_correct_count ?? "?"}/${comparison?.total ?? 3}`,
                    },
                    ...(comparison?.available
                      ? [
                          {
                            label: `Actual podium · ${comparison.race_name}`,
                            value: comparison.comparison?.map((c) => c.actual_driver).join(" · "),
                          },
                        ]
                      : []),
                    {
                      label: `Your score · ${comparison?.race_name ?? "Last race"}`,
                      value: userScore
                        ? `${userScore.total_points} pts`
                        : user
                          ? "No picks submitted"
                          : "Sign in to see",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex justify-between items-center rounded-xl px-4 py-2.5"
                      style={{ backgroundColor: "#0d0d0d", border: "1px solid #18181b" }}
                    >
                      <span className="text-zinc-400 text-xs">{stat.label}</span>
                      <span className="text-red-500 font-black text-sm">{stat.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Next Race */}
          {race && (
            <Section>
              <p className="label-eyebrow mb-3">Next Race</p>
              <h2 className="text-white font-black text-2xl sm:text-[34px] leading-tight">
                {race.name}
              </h2>
              <p className="text-zinc-400 mt-2 text-sm sm:text-base">{race.circuit}</p>
              <p className="text-zinc-600 mt-1 text-sm">{race.country}</p>

              <div className="mt-8 sm:mt-10">
                <p className="text-zinc-600 uppercase text-[10px] mb-3 tracking-[0.3em]">
                  Lights Out In
                </p>
                <div className="flex items-end flex-wrap gap-1">
                  <span className="text-white text-4xl sm:text-6xl font-black tabular-nums">
                    {String(timeLeft.days).padStart(2, "0")}
                  </span>
                  <span className="text-zinc-600 text-xl sm:text-2xl mb-1 sm:mb-2">:</span>
                  <span className="text-white text-4xl sm:text-6xl font-black tabular-nums">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="text-zinc-600 text-xl sm:text-2xl mb-1 sm:mb-2">:</span>
                  <span className="text-white text-4xl sm:text-6xl font-black tabular-nums">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-zinc-600 text-xl sm:text-2xl mb-1 sm:mb-2">:</span>
                  <span className="text-red-500 text-4xl sm:text-6xl font-black tabular-nums">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex mt-2 text-zinc-600 text-[10px] gap-8 sm:gap-16">
                  <span>DAYS</span>
                  <span>HRS</span>
                  <span>MIN</span>
                  <span>SEC</span>
                </div>
              </div>

              <div className="h-px bg-[#27272a] my-6 sm:my-8" />

              <div className="space-y-4">
                {[
                  { label: "Round", value: race.round },
                  {
                    label: "Weekend",
                    value: new Date(race.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  },
                  { label: "Circuit", value: race.circuit },
                  { label: "Status", value: "Upcoming", accent: true },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-[10px]">{row.label}</span>
                    <span
                      className={`font-semibold text-sm ${row.accent ? "text-green-400" : "text-white"}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                to="/race"
                className="inline-block text-red-500 font-bold text-base mt-8 hover:text-red-400 transition-colors"
              >
                View Race Brief →
              </Link>
            </Section>
          )}

          {/* Last Race Comparison */}
          {comparison?.available && !inGap && (
            <Section>
              <p className="label-eyebrow mb-1.5">
                Last Race AI predictions — {comparison.race_name}
              </p>
              <p className="text-zinc-600 text-xs mb-6">
                Prediction locked after: {comparison.sessions_used?.join(", ")}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-zinc-400 text-sm font-semibold mb-3">PitWall AI Predicted</p>
                  <div className="space-y-2">
                    {comparison.comparison?.map((c) => (
                      <ListRow
                        key={c.position}
                        position={`P${c.position}`}
                        title={c.predicted_driver}
                        subtitle={c.predicted_team}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-zinc-400 text-sm font-semibold mb-3">Actual Result</p>
                  <div className="space-y-2">
                    {comparison.comparison?.map((c) => (
                      <ListRow
                        key={c.position}
                        position={`P${c.position}`}
                        title={c.actual_driver}
                        subtitle={c.actual_team}
                        highlight={c.driver_correct}
                        trailing={
                          <span
                            className={`text-xs font-bold ${c.driver_correct ? "text-green-400" : "text-red-400"}`}
                          >
                            {c.driver_correct ? "correct" : "wrong"}
                          </span>
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 mt-6 pt-4 section-divider">
                <div>
                  <p className="text-2xl font-black text-green-400">
                    {comparison.constructor_correct_count}/{comparison.total}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">Constructor accuracy</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-red-400">
                    {comparison.driver_correct_count}/{comparison.total}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">Driver accuracy</p>
                </div>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}
