/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import {
  getSeasonLeaderboard,
  getRaceLeaderboard,
  getScoredRounds,
  getUpcomingRace,
  getPredictionComparison,
  triggerAutoScore,
} from "../api/pitwall"
import F1Loader from "../components/F1loader"
import type { RaceEntry, SeasonEntry } from "../types"
import ProcessingBanner from "../components/ProcessingBanner"
import PageHeader from "../components/ui/PageHeader"
import TabBar from "../components/ui/TabBar"
import ListRow from "../components/ui/ListRow"
import Button from "../components/ui/Button"
import { getPodiumColor } from "../lib/theme"

function Avatar({ url, username }: { url: string | null; username: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={username}
        className="w-8 h-8 rounded-full object-cover border border-zinc-700"
      />
    )
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center"
      style={{ backgroundColor: "#1c0505", border: "1px solid #7f1d1d" }}
    >
      <span className="text-red-500 font-black text-xs">{username[0]?.toUpperCase()}</span>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="font-black text-sm w-6 text-center" style={{ color: getPodiumColor(rank - 1) }}>
      {rank}
    </span>
  )
}

function PickCell({ pick, actual }: { pick: string | null; actual: string | null }) {
  if (!pick) return <span className="text-zinc-700 text-xs">—</span>
  const correct = pick === actual
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded"
      style={{
        backgroundColor: correct ? "#052e16" : "#18181b",
        color: correct ? "#4ade80" : "#a1a1aa",
        border: correct ? "1px solid #166534" : "1px solid #27272a",
      }}
    >
      {pick}
    </span>
  )
}

function BlurOverlay() {
  const navigate = useNavigate()
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div
        className="rounded-2xl p-8 text-center max-w-sm mx-4 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(9, 9, 9, 0.95)", border: "1px solid #18181b" }}
      >
        <p className="text-white font-black text-xl mb-2">Sign in to see the leaderboard</p>
        <p className="text-zinc-500 text-sm mb-6">
          Create an account to compete against other fans and track your rankings
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate("/login")} className="w-full">
            Sign In
          </Button>
          <Button variant="ghost" onClick={() => navigate("/login")} className="w-full">
            Create Account
          </Button>
        </div>
      </div>
    </div>
  )
}

function SeasonTab({
  currentUserId,
  isAuthed,
}: {
  currentUserId: string | undefined
  isAuthed: boolean
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard-season"],
    queryFn: getSeasonLeaderboard,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <F1Loader type={1} />

  const leaderboard: SeasonEntry[] = data?.leaderboard ?? []
  const currentUserEntry = leaderboard.find((e) => e.user_id === currentUserId)

  return (
    <div className="space-y-4">
      {isAuthed && currentUserEntry && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "#1c0505", border: "1px solid rgba(239, 68, 68, 0.4)" }}
        >
          <p className="text-red-500 text-[10px] font-bold tracking-widest uppercase mb-3">
            Your Rank
          </p>
          <ListRow
            position={<RankBadge rank={currentUserEntry.rank} />}
            title={currentUserEntry.username}
            subtitle={`${currentUserEntry.races_scored} race${currentUserEntry.races_scored !== 1 ? "s" : ""} scored`}
            trailing={
              <div className="text-right">
                <p className="text-white font-black text-xl">{currentUserEntry.total_points}</p>
                <p className="text-zinc-500 text-xs">pts · avg {currentUserEntry.avg_points}</p>
              </div>
            }
          />
        </div>
      )}

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#090909", border: "1px solid #18181b" }}
      >
        <div className="hidden lg:grid grid-cols-12 gap-2 px-5 py-3 border-b border-[#27272a]">
          <span className="col-span-1 label-eyebrow">#</span>
          <span className="col-span-5 label-eyebrow">Fan</span>
          <span className="col-span-2 label-eyebrow text-center">Races</span>
          <span className="col-span-2 label-eyebrow text-center">Avg</span>
          <span className="col-span-2 label-eyebrow text-right">Pts</span>
        </div>

        <div className={`p-2 sm:p-3 space-y-2 ${!isAuthed ? "blur-sm pointer-events-none select-none" : ""}`}>
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.user_id === currentUserId
            return (
              <div key={entry.user_id}>
                <div className="lg:hidden">
                  <ListRow
                    highlight={isCurrentUser}
                    position={<RankBadge rank={entry.rank} />}
                    title={
                      <span className="flex items-center gap-2">
                        <Avatar url={entry.avatar_url} username={entry.username} />
                        <span>{entry.username}</span>
                        {isCurrentUser && <span className="text-red-500 text-xs">You</span>}
                      </span>
                    }
                    subtitle={`${entry.races_scored} races · avg ${entry.avg_points}`}
                    trailing={
                      <span className="text-white font-black text-lg">{entry.total_points}</span>
                    }
                  />
                </div>
                <div
                  className={`hidden lg:grid grid-cols-12 gap-2 px-3 py-3 items-center rounded-xl ${isCurrentUser ? "border border-[#713f12]" : ""}`}
                  style={{ backgroundColor: isCurrentUser ? "#1c0505" : "#0d0d0d" }}
                >
                  <div className="col-span-1">
                    <RankBadge rank={entry.rank} />
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <Avatar url={entry.avatar_url} username={entry.username} />
                    <div>
                      <p className="text-white font-bold text-sm">{entry.username}</p>
                      {isCurrentUser && <p className="text-red-500 text-xs">You</p>}
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-zinc-400 text-sm">
                    {entry.races_scored}
                  </div>
                  <div className="col-span-2 text-center text-zinc-400 text-sm">
                    {entry.avg_points}
                  </div>
                  <div className="col-span-2 text-right text-white font-black text-lg">
                    {entry.total_points}
                  </div>
                </div>
              </div>
            )
          })}
          {leaderboard.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-zinc-600 text-sm">No scores yet this season</p>
            </div>
          )}
        </div>

        {!isAuthed && <BlurOverlay />}
      </div>
    </div>
  )
}

function RaceTab({
  currentUserId,
  isAuthed,
}: {
  currentUserId: string | undefined
  isAuthed: boolean
}) {
  const { data: roundsData } = useQuery({
    queryKey: ["scored-rounds"],
    queryFn: getScoredRounds,
    staleTime: 10 * 60 * 1000,
  })

  const scoredRounds: { round: number; name: string }[] = roundsData?.rounds ?? []
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const activeRound = selectedRound ?? scoredRounds[scoredRounds.length - 1]?.round

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard-race", activeRound],
    queryFn: () => getRaceLeaderboard(activeRound!),
    enabled: !!activeRound,
    staleTime: 5 * 60 * 1000,
  })

  const leaderboard: RaceEntry[] = data?.leaderboard ?? []

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {scoredRounds.map((r) => (
          <button
            key={r.round}
            type="button"
            onClick={() => setSelectedRound(r.round)}
            className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: activeRound === r.round ? "#ef4444" : "#0d0d0d",
              color: activeRound === r.round ? "#ffffff" : "#71717a",
              border: activeRound === r.round ? "1px solid #ef4444" : "1px solid #18181b",
            }}
          >
            R{r.round} · {r.name}
          </button>
        ))}
        {scoredRounds.length === 0 && (
          <p className="text-zinc-600 text-sm">No races scored yet</p>
        )}
      </div>

      {leaderboard.length > 0 && (
        <div
          className="rounded-xl px-4 sm:px-5 py-3 flex flex-wrap items-center gap-4 sm:gap-6"
          style={{ backgroundColor: "#0d0d0d", border: "1px solid #18181b" }}
        >
          <p className="label-eyebrow">Actual Result</p>
          {[
            { label: "P1", value: leaderboard[0]?.actual_p1 },
            { label: "P2", value: leaderboard[0]?.actual_p2 },
            { label: "P3", value: leaderboard[0]?.actual_p3 },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <span className="text-zinc-600 text-xs">{r.label}</span>
              <span className="text-white font-black text-sm">{r.value ?? "—"}</span>
            </div>
          ))}
        </div>
      )}

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#090909", border: "1px solid #18181b" }}
      >
        <div className="hidden lg:grid grid-cols-12 gap-2 px-5 py-3 border-b border-[#27272a]">
          <span className="col-span-1 label-eyebrow">#</span>
          <span className="col-span-3 label-eyebrow">Fan</span>
          <span className="col-span-2 label-eyebrow text-center">P1</span>
          <span className="col-span-2 label-eyebrow text-center">P2</span>
          <span className="col-span-2 label-eyebrow text-center">P3</span>
          <span className="col-span-2 label-eyebrow text-right">Pts</span>
        </div>

        <div className={`p-2 sm:p-3 space-y-2 ${!isAuthed ? "blur-sm pointer-events-none select-none" : ""}`}>
          {isLoading ? (
            <div className="px-5 py-12 text-center">
              <p className="text-zinc-600 text-sm">Loading...</p>
            </div>
          ) : (
            leaderboard.map((entry) => {
              const isCurrentUser = entry.user_id === currentUserId
              return (
                <div key={entry.user_id}>
                  <div className="lg:hidden">
                    <ListRow
                      highlight={isCurrentUser}
                      position={<RankBadge rank={entry.rank} />}
                      title={
                        <span className="flex items-center gap-2">
                          <Avatar url={entry.avatar_url} username={entry.username} />
                          <span className="truncate">{entry.username}</span>
                        </span>
                      }
                      trailing={
                        <span className="text-white font-black text-lg">{entry.total_points}</span>
                      }
                    >
                      <div className="flex gap-2 mt-2">
                        <PickCell pick={entry.p1_pick} actual={entry.actual_p1} />
                        <PickCell pick={entry.p2_pick} actual={entry.actual_p2} />
                        <PickCell pick={entry.p3_pick} actual={entry.actual_p3} />
                      </div>
                    </ListRow>
                  </div>
                  <div
                    className={`hidden lg:grid grid-cols-12 gap-2 px-3 py-3 items-center rounded-xl ${isCurrentUser ? "border border-[#713f12]" : ""}`}
                    style={{ backgroundColor: isCurrentUser ? "#1c0505" : "#0d0d0d" }}
                  >
                    <div className="col-span-1">
                      <RankBadge rank={entry.rank} />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Avatar url={entry.avatar_url} username={entry.username} />
                      <div>
                        <p className="text-white font-bold text-xs truncate max-w-[80px]">
                          {entry.username}
                        </p>
                        {isCurrentUser && <p className="text-red-500 text-xs">You</p>}
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <PickCell pick={entry.p1_pick} actual={entry.actual_p1} />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <PickCell pick={entry.p2_pick} actual={entry.actual_p2} />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <PickCell pick={entry.p3_pick} actual={entry.actual_p3} />
                    </div>
                    <div className="col-span-2 text-right text-white font-black text-lg">
                      {entry.total_points}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {!isLoading && leaderboard.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-zinc-600 text-sm">No scores for this round yet</p>
            </div>
          )}
        </div>

        {!isAuthed && <BlurOverlay />}
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"season" | "race">("season")
  const isAuthed = !!user

  const { data: race } = useQuery({
    queryKey: ["upcoming-race"],
    queryFn: getUpcomingRace,
    staleTime: 10 * 60 * 1000,
  })
  const { data: comparison } = useQuery({
    queryKey: ["comparison"],
    queryFn: getPredictionComparison,
    staleTime: 10 * 60 * 1000,
  })
  const upcomingRound = race?.round ? parseInt(race.round) : undefined
  const comparisonRound = (comparison as any)?.round
  const inGap = upcomingRound && comparisonRound ? upcomingRound - comparisonRound > 1 : false
  const justFinishedLabel = inGap && upcomingRound ? `Round ${upcomingRound - 1}` : null

  useQuery({
    queryKey: ["auto-score-trigger"],
    queryFn: () => triggerAutoScore(),
    staleTime: 30 * 60 * 1000,
    retry: false,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="2026 Season"
        title="Leaderboard"
        subtitle="Global rankings & per-race breakdown"
      />

      {inGap && justFinishedLabel && <ProcessingBanner raceName={justFinishedLabel} />}

      <TabBar
        tabs={[
          { id: "season", label: "Season Rankings" },
          { id: "race", label: "Race-by-Race" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "season" ? (
        <SeasonTab currentUserId={user?.id} isAuthed={isAuthed} />
      ) : (
        <RaceTab currentUserId={user?.id} isAuthed={isAuthed} />
      )}
    </div>
  )
}
