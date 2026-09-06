import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useAuth } from "../../hooks/useAuth"
import {
  getUpcomingRace,
  getWeekendPredictions,
  getUserStats,
  getUserPicks,
  getUserScores,
  createUserPicks,
  updateUserPicks,
} from "../../api/pitwall"
import type { RaceScore } from "../../types"

const ROOKIES_2026 = [
  { code: "ANT", name: "Andrea Kimi Antonelli", team: "Mercedes" },
  { code: "HAD", name: "Isack Hadjar", team: "Red Bull" },
  { code: "LIN", name: "Arvid Lindblad", team: "RB F1 Team" },
  { code: "BOR", name: "Gabriel Bortoleto", team: "Audi" },
  { code: "BEA", name: "Oliver Bearman", team: "Haas F1 Team" },
  { code: "COL", name: "Franco Colapinto", team: "Alpine F1 Team" },
]

const TEAM_COLORS: Record<string, string> = {
  "Mercedes": "#2dd4bf",
  "Ferrari": "#ef4444",
  "McLaren": "#fb923c",
  "Red Bull": "#3b82f6",
  "Aston Martin": "#22c55e",
  "Alpine F1 Team": "#ec4899",
  "Williams": "#38bdf8",
  "Haas F1 Team": "#9ca3af",
  "RB F1 Team": "#818cf8",
  "Audi": "#d1d5db",
  "Cadillac F1 Team": "#facc15",
}

export default function PredictionsScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const [p1Pick, setP1Pick] = useState("")
  const [p2Pick, setP2Pick] = useState("")
  const [p3Pick, setP3Pick] = useState("")
  const [rookiePick, setRookiePick] = useState("")
  const [existingPick, setExistingPick] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePickPos, setActivePickPos] = useState<"p1" | "p2" | "p3" | null>(null)

  const { data: race } = useQuery({
    queryKey: ["upcoming-race"],
    queryFn: getUpcomingRace,
    staleTime: 10 * 60 * 1000,
  })

  const { data: stats } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: () => getUserStats(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const { data: prediction } = useQuery({
    queryKey: ["predictions", race?.circuit, race?.location],
    queryFn: () => getWeekendPredictions(race!.circuit, race!.location),
    enabled: !!race,
    staleTime: 5 * 60 * 1000,
  })

  const { data: picksData } = useQuery({
    queryKey: ["user-picks", user?.id, race?.round],
    queryFn: () => getUserPicks(user!.id, parseInt(race!.round)),
    enabled: !!user && !!race,
    staleTime: 5 * 60 * 1000,
  })

  const { data: scores = [] } = useQuery({
    queryKey: ["user-scores", user?.id],
    queryFn: () => getUserScores(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
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

  const hasRaceStarted = race?.date
    ? (() => {
        const timeStr = race.time
          ? (race.time.endsWith("Z") ? race.time : `${race.time}Z`)
          : "00:00:00Z"
        const raceDate = new Date(`${race.date}T${timeStr}`)
        return !isNaN(raceDate.getTime()) && new Date() >= raceDate
      })()
    : false

  const isLocked = existingPick?.is_locked || hasRaceStarted

  const drivers = prediction?.predictions ?? []
  const top3AI = drivers.slice(0, 3)
  const selectedDrivers = [p1Pick, p2Pick, p3Pick]

  const handleSelectDriver = (code: string) => {
    if (!activePickPos) return
    if (activePickPos === "p1") setP1Pick(code)
    if (activePickPos === "p2") setP2Pick(code)
    if (activePickPos === "p3") setP3Pick(code)
    setActivePickPos(null)
  }

  const getPickValue = (pos: "p1" | "p2" | "p3") => {
    if (pos === "p1") return p1Pick
    if (pos === "p2") return p2Pick
    return p3Pick
  }

  const handleSubmit = async () => {
    if (!user || !race || !p1Pick || !p2Pick || !p3Pick || !rookiePick) return
    if (p1Pick === p2Pick || p1Pick === p3Pick || p2Pick === p3Pick) {
      setError("Each position must have a different driver")
      return
    }
    setSubmitting(true)
    setError(null)
    const pickData = { p1_pick: p1Pick, p2_pick: p2Pick, p3_pick: p3Pick, rookie_pick: rookiePick }
    try {
      if (existingPick) {
        await updateUserPicks(user.id, parseInt(race.round), pickData)
      } else {
        await createUserPicks(user.id, parseInt(race.round), pickData)
      }
      setExistingPick((prev: any) => ({ ...(prev || {}), ...pickData, is_locked: false }))
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit picks")
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <Text className="text-white font-black text-3xl mb-2">Sign In</Text>
        <Text className="text-zinc-500 text-sm text-center mb-8">
          Create an account to submit picks and compete against the AI
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/login")}
          className="bg-red-500 rounded-2xl py-4 items-center w-full"
        >
          <Text className="text-white font-black text-base">Sign In to Predict</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 40 }}
    >
      {/* Header */}
      <View className="mb-6">
        <Text
          className="text-zinc-500 uppercase text-[10px] mb-3"
          style={{ letterSpacing: 3 }}
        >
          2026 Season · Round {race?.round}
        </Text>
        <Text
          className="text-white font-black"
          style={{ fontSize: 40, lineHeight: 44 }}
        >
          Prediction
        </Text>
        <Text
          className="text-red-500 font-black"
          style={{ fontSize: 40, lineHeight: 44 }}
        >
          Centre
        </Text>
        <Text className="text-zinc-400 mt-2">{race?.name}</Text>
      </View>

      {/* Profile Card */}
      {stats && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#27272a",
            paddingTop: 20,
            marginBottom: 28,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#1c0505",
                  borderWidth: 1,
                  borderColor: "#7f1d1d",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text className="text-red-500 font-black text-base">
                  {user?.email?.[0].toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="text-white font-black text-base">
                  {user?.email?.split("@")[0]}
                </Text>
                <Text className="text-zinc-500 text-xs mt-0.5">{stats.tagline}</Text>
              </View>
            </View>
            {stats.streak > 0 && (
              <View className="items-end">
                <Text className="text-red-500 font-black text-2xl">{stats.streak}</Text>
                <Text className="text-zinc-600 text-[10px]">race streak</Text>
              </View>
            )}
          </View>

          {/* Points bar */}
          <View className="flex-row justify-between mb-1">
            <Text className="text-zinc-600 text-xs">Season points</Text>
            <Text className="text-white text-xs font-bold">{stats.total_points} pts</Text>
          </View>
          <View style={{ height: 2, backgroundColor: "#27272a", borderRadius: 1, marginBottom: 16, overflow: "hidden" }}>
            <View
              style={{
                height: 2,
                width: `${Math.min((stats.total_points / 200) * 100, 100)}%`,
                backgroundColor: "#ef4444",
                borderRadius: 1,
              }}
            />
          </View>

          <View className="flex-row">
            {[
              { label: "Total", value: stats.total_points },
              { label: "Races", value: stats.races_entered },
              { label: "Avg", value: stats.avg_points || "—" },
              { label: "Best", value: stats.best_race ? `${stats.best_race_points}p` : "—" },
            ].map(s => (
              <View key={s.label} className="flex-1 items-center">
                <Text className="text-white font-black text-lg">{s.value}</Text>
                <Text className="text-zinc-600 text-[10px] mt-0.5">{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Not race week gate */}
      {!isRaceWeek ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#27272a",
            paddingTop: 20,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#1c1a00",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#713f12",
              padding: 16,
            }}
          >
            <Text className="text-yellow-400 font-black text-sm mb-1">
              Picks Open Race Week
            </Text>
            <Text className="text-zinc-400 text-xs leading-relaxed">
              Predictions for {race?.name} open 7 days before race. Check back then.
            </Text>
          </View>
        </View>
      ) : (
        <>
          {/* Locked banner */}
          {isLocked && (
            <View
              style={{
                backgroundColor: "#1c1a00",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#713f12",
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text className="text-yellow-400 text-sm font-black mb-0.5">Picks Locked</Text>
              <Text className="text-zinc-400 text-xs">
                Race has started — picks are locked in. Check back after the race for your score!
              </Text>
            </View>
          )}

          {/* AI vs Your Picks */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#27272a",
              paddingTop: 20,
              marginBottom: 28,
            }}
          >
            <Text
              className="text-zinc-500 uppercase text-[10px] mb-4"
              style={{ letterSpacing: 3 }}
            >
              AI vs Your Prediction
            </Text>

            {/* AI top 3 */}
            <Text className="text-zinc-600 text-xs font-semibold uppercase tracking-wider mb-2">
              PitWall AI Predicts
            </Text>
            <View className="gap-2 mb-5">
              {top3AI.map((driver, i) => (
                <View
                  key={driver.driver_code}
                  className="flex-row items-center gap-3"
                  style={{
                    backgroundColor: "#0d0d0d",
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#18181b",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text className="text-zinc-600 font-black text-xs w-5">P{i + 1}</Text>
                  <Text className="text-white font-black text-sm flex-1 tracking-wider">{driver.driver_code}</Text>
                  <Text className="text-zinc-500 text-xs">{driver.team}</Text>
                  <Text className="text-red-500 font-bold text-sm">{driver.win_probability}%</Text>
                </View>
              ))}
            </View>

            {/* Your picks */}
            <Text className="text-zinc-600 text-xs font-semibold uppercase tracking-wider mb-2">
              Your Prediction
            </Text>
            <View className="gap-2">
              {(["p1", "p2", "p3"] as const).map((pos, i) => {
                const value = getPickValue(pos)
                const isActive = activePickPos === pos
                return (
                  <TouchableOpacity
                    key={pos}
                    disabled={isLocked}
                    onPress={() => setActivePickPos(isActive ? null : pos)}
                    style={{
                      backgroundColor: isActive ? "#1c0505" : "#0d0d0d",
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isActive ? "#ef4444" : value ? "#27272a" : "#18181b",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Text className="text-zinc-600 font-black text-xs w-5">P{i + 1}</Text>
                    <Text
                      style={{
                        flex: 1,
                        color: value ? "#ffffff" : "#52525b",
                        fontWeight: "900",
                        fontSize: 14,
                        letterSpacing: 1,
                      }}
                    >
                      {value || "Tap to select"}
                    </Text>
                    <Text style={{ color: isActive ? "#ef4444" : "#52525b", fontSize: 12 }}>
                      {isActive ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Driver selector dropdown */}
            {activePickPos && (
              <ScrollView
                style={{
                  maxHeight: 280,
                  backgroundColor: "#0a0a0a",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#27272a",
                  marginTop: 8,
                }}
                nestedScrollEnabled
              >
                {drivers.map(d => {
                  const isSelected = selectedDrivers.includes(d.driver_code) &&
                    d.driver_code !== getPickValue(activePickPos)
                  const teamColor = TEAM_COLORS[d.team] ?? "#71717a"
                  return (
                    <TouchableOpacity
                      key={d.driver_code}
                      disabled={isSelected}
                      onPress={() => handleSelectDriver(d.driver_code)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: "#18181b",
                        opacity: isSelected ? 0.3 : 1,
                      }}
                    >
                      <View style={{ width: 3, height: 28, borderRadius: 1, backgroundColor: teamColor }} />
                      <Text className="text-white font-black text-sm w-10 tracking-wider">{d.driver_code}</Text>
                      <Text className="text-zinc-500 text-xs flex-1" numberOfLines={1}>{d.driver_name}</Text>
                      <Text className="text-red-500 text-xs font-bold">{d.win_probability}%</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}
          </View>

          {/* Rookie Spotlight */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#27272a",
              paddingTop: 20,
              marginBottom: 28,
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text
                  className="text-zinc-500 uppercase text-[10px] mb-1"
                  style={{ letterSpacing: 3 }}
                >
                  Rookie Spotlight
                </Text>
                <Text className="text-white font-black text-lg">Top Rookie?</Text>
              </View>
              <View
                style={{
                  backgroundColor: "#2e1065",
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text className="text-purple-300 text-[10px] font-black">Human Only</Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {ROOKIES_2026.map(rookie => (
                <TouchableOpacity
                  key={rookie.code}
                  disabled={isLocked}
                  onPress={() => setRookiePick(rookie.code)}
                  style={{
                    flex: 1,
                    minWidth: "30%",
                    backgroundColor: rookiePick === rookie.code ? "#1c0505" : "#0d0d0d",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: rookiePick === rookie.code ? "#ef4444" : "#18181b",
                    padding: 10,
                  }}
                >
                  <Text className="text-white font-black text-sm">{rookie.code}</Text>
                  <Text className="text-zinc-500 text-[10px] mt-0.5" numberOfLines={1}>{rookie.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Error */}
          {error && (
            <View
              style={{
                backgroundColor: "#1c0000",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#7f1d1d",
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          {/* Submit / Locked */}
          {isLocked ? (
            existingPick ? (
              <View
                style={{
                  backgroundColor: "#052e16",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#166534",
                  padding: 20,
                  alignItems: "center",
                  marginBottom: 28,
                }}
              >
                <Text className="text-green-400 font-black text-lg mb-1">Picks Locked In</Text>
                <Text className="text-zinc-400 text-sm mb-5">Race has started — no more changes</Text>
                <View className="flex-row gap-6">
                  {[
                    { label: "P1", value: existingPick.p1_pick, color: "#ffffff" },
                    { label: "P2", value: existingPick.p2_pick, color: "#ffffff" },
                    { label: "P3", value: existingPick.p3_pick, color: "#ffffff" },
                    { label: "Rookie", value: existingPick.rookie_pick, color: "#d8b4fe" },
                  ].map(p => (
                    <View key={p.label} className="items-center">
                      <Text style={{ color: p.color, fontWeight: "900", fontSize: 18 }}>{p.value}</Text>
                      <Text className="text-zinc-600 text-[10px] mt-1">{p.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: "#1c0000",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#7f1d1d",
                  padding: 20,
                  alignItems: "center",
                  marginBottom: 28,
                }}
              >
                <Text className="text-red-400 font-black text-lg mb-1">Picks Closed</Text>
                <Text className="text-zinc-400 text-sm">Race has started — picks are no longer accepted</Text>
              </View>
            )
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !p1Pick || !p2Pick || !p3Pick || !rookiePick}
              style={{
                backgroundColor: (!p1Pick || !p2Pick || !p3Pick || !rookiePick) ? "#7f1d1d" : "#ef4444",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                marginBottom: 28,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-black text-base">
                  {submitted ? "Picks Saved!" :
                    existingPick ? "Update My Picks" :
                      p1Pick || p2Pick || p3Pick || rookiePick ? "Submit My Picks" :
                        "Make Your Predictions Above"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Previous Scores */}
      {(scores as RaceScore[]).length > 0 && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#27272a",
            paddingTop: 20,
          }}
        >
          <Text
            className="text-zinc-500 uppercase text-[10px] mb-4"
            style={{ letterSpacing: 3 }}
          >
            Previous Races
          </Text>
          <View className="gap-3">
            {(scores as RaceScore[]).map(score => (
              <View
                key={score.id}
                style={{
                  backgroundColor: "#0d0d0d",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#18181b",
                  padding: 14,
                }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-zinc-500 text-[10px]">Round {score.round}</Text>
                    <Text className="text-white font-black text-base">{score.race_name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-red-500 font-black text-3xl">{score.total_points}</Text>
                    <Text className="text-zinc-600 text-[10px]">points</Text>
                  </View>
                </View>
                <View
                  className="flex-row"
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: "#27272a",
                    paddingTop: 10,
                  }}
                >
                  {[
                    { label: "Driver", value: score.driver_points },
                    { label: "Constructor", value: score.constructor_points },
                    { label: "Rookie", value: score.rookie_points, color: "#d8b4fe" },
                  ].map(s => (
                    <View key={s.label} className="flex-1 items-center">
                      <Text style={{ color: s.color ?? "#ffffff", fontWeight: "900", fontSize: 18 }}>
                        {s.value}
                      </Text>
                      <Text className="text-zinc-600 text-[10px] mt-0.5">{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}