import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import {
  getSeasonLeaderboard,
  getRaceLeaderboard,
  getScoredRounds,
} from "../api/pitwall"
import F1Loader from "../components/F1loader"
import type { RaceEntry, SeasonEntry } from "../types"

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
    <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
      <span className="text-red-500 font-black text-xs">
        {username[0]?.toUpperCase()}
      </span>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="text-yellow-400 font-black text-sm w-6 text-center">1</span>
  if (rank === 2)
    return <span className="text-zinc-300 font-black text-sm w-6 text-center">2</span>
  if (rank === 3)
    return <span className="text-amber-600 font-black text-sm w-6 text-center">3</span>
  return <span className="text-zinc-600 font-black text-sm w-6 text-center">{rank}</span>
}

function PickCell({ pick, actual }: { pick: string | null; actual: string | null }) {
  if (!pick) return <span className="text-zinc-700 text-xs">—</span>
  const correct = pick === actual
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded ${
        correct
          ? "bg-green-500/10 text-green-400 border border-green-500/20"
          : "bg-zinc-800 text-zinc-400"
      }`}
    >
      {pick}
    </span>
  )
}

function BlurOverlay() {
  const navigate = useNavigate()
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-8 text-center max-w-sm mx-4 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <p className="text-white font-black text-xl mb-2">Sign in to see the leaderboard</p>
        <p className="text-zinc-500 text-sm mb-6">
          Create an account to compete against other fans and track your rankings
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white font-bold py-3 rounded-xl transition-all cursor-pointer"
          >
            Create Account
          </button>
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
        <div className="border border-red-500/40 rounded-2xl p-4 bg-red-500/5">
          <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-3">
            Your Rank
          </p>
          <div className="flex items-center gap-4">
            <RankBadge rank={currentUserEntry.rank} />
            <Avatar url={currentUserEntry.avatar_url} username={currentUserEntry.username} />
            <div className="flex-1">
              <p className="text-white font-black text-sm">{currentUserEntry.username}</p>
              <p className="text-zinc-500 text-xs">
                {currentUserEntry.races_scored} race{currentUserEntry.races_scored !== 1 ? "s" : ""} scored
              </p>
            </div>
            <div className="text-right">
              <p className="text-white font-black text-xl">{currentUserEntry.total_points}</p>
              <p className="text-zinc-500 text-xs">pts</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-400 font-bold text-sm">{currentUserEntry.avg_points}</p>
              <p className="text-zinc-600 text-xs">avg</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative border border-zinc-800 rounded-2xl bg-zinc-950 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-800">
          <span className="col-span-1 text-zinc-600 text-xs font-semibold tracking-widest uppercase">#</span>
          <span className="col-span-5 text-zinc-600 text-xs font-semibold tracking-widest uppercase">Fan</span>
          <span className="col-span-2 text-zinc-600 text-xs font-semibold tracking-widest uppercase text-center">Races</span>
          <span className="col-span-2 text-zinc-600 text-xs font-semibold tracking-widest uppercase text-center">Avg</span>
          <span className="col-span-2 text-zinc-600 text-xs font-semibold tracking-widest uppercase text-right">Pts</span>
        </div>

        <div className={`divide-y divide-zinc-900 ${!isAuthed ? "blur-sm pointer-events-none select-none" : ""}`}>
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.user_id === currentUserId
            return (
              <div
                key={entry.user_id}
                className={`grid grid-cols-12 gap-2 px-5 py-4 items-center transition-colors ${
                  isCurrentUser
                    ? "bg-red-500/5 border-l-2 border-red-500"
                    : "hover:bg-zinc-900/50"
                }`}
              >
                <div className="col-span-1"><RankBadge rank={entry.rank} /></div>
                <div className="col-span-5 flex items-center gap-3">
                  <Avatar url={entry.avatar_url} username={entry.username} />
                  <div>
                    <p className="text-white font-bold text-sm leading-none">{entry.username}</p>
                    {isCurrentUser && <p className="text-red-500 text-xs mt-0.5">You</p>}
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-zinc-400 text-sm">{entry.races_scored}</p>
                </div>
                <div className="col-span-2 text-center">
                  <p className="text-zinc-400 text-sm">{entry.avg_points}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-white font-black text-lg">{entry.total_points}</p>
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
            onClick={() => setSelectedRound(r.round)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeRound === r.round
                ? "bg-red-500 text-white"
                : "border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            R{r.round} · {r.name}
          </button>
        ))}

        {scoredRounds.length === 0 && (
          <p className="text-zinc-600 text-sm">No races scored yet</p>
        )}
      </div>

      {leaderboard.length > 0 && (
        <div className="border border-zinc-800 rounded-xl px-5 py-3 bg-zinc-900 flex items-center gap-6">
          <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
            Actual Result
          </p>
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

      <div className="relative border border-zinc-800 rounded-2xl bg-zinc-950 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-zinc-800">
          <span className="col-span-1 text-zinc-600 text-xs font-semibold tracking-widest uppercase">#</span>
          <span className="col-span-3 text-zinc-600 text-xs font-semibold tracking-widest uppercase">Fan</span>
          <span className="col-span-2 text-zinc-600 text-xs font-semibold tracking-widest uppercase text-center">P1</span>
          <span className="col-span-2 text-zinc-600 text-xs font-semibold tracking-widest uppercase text-center">P2</span>
          <span className="col-span-2 text-zinc-600 text-xs font-semibold tracking-widest uppercase text-center">P3</span>
          <span className="col-span-2 text-zinc-600 text-xs font-semibold tracking-widest uppercase text-right">Pts</span>
        </div>

        <div className={`divide-y divide-zinc-900 ${!isAuthed ? "blur-sm pointer-events-none select-none" : ""}`}>
          {isLoading ? (
            <div className="px-5 py-12 text-center">
              <p className="text-zinc-600 text-sm">Loading...</p>
            </div>
          ) : (
            leaderboard.map((entry) => {
              const isCurrentUser = entry.user_id === currentUserId
              return (
                <div
                  key={entry.user_id}
                  className={`grid grid-cols-12 gap-2 px-5 py-4 items-center transition-colors ${
                    isCurrentUser
                      ? "bg-red-500/5 border-l-2 border-red-500"
                      : "hover:bg-zinc-900/50"
                  }`}
                >
                  <div className="col-span-1"><RankBadge rank={entry.rank} /></div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Avatar url={entry.avatar_url} username={entry.username} />
                    <div>
                      <p className="text-white font-bold text-xs leading-none truncate max-w-[80px]">
                        {entry.username}
                      </p>
                      {isCurrentUser && <p className="text-red-500 text-xs mt-0.5">You</p>}
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
                  <div className="col-span-2 text-right">
                    <p className="text-white font-black text-lg">{entry.total_points}</p>
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

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-red-500 pl-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">
            2026 Season
          </span>
        </div>
        <h1 className="text-5xl font-black text-white leading-none mb-1">Leaderboard</h1>
        <p className="text-zinc-400 text-sm">Global rankings & per-race breakdown</p>
      </div>

      <div className="flex gap-2">
        {(["season", "race"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-red-500 text-white"
                : "border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
            }`}
          >
            {tab === "season" ? "Season Rankings" : "Race-by-Race"}
          </button>
        ))}
      </div>

      {activeTab === "season" ? (
        <SeasonTab currentUserId={user?.id} isAuthed={isAuthed} />
      ) : (
        <RaceTab currentUserId={user?.id} isAuthed={isAuthed} />
      )}
    </div>
  )
}