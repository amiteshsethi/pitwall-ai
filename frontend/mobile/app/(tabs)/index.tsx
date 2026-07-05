import React, { useEffect, useState } from "react"
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native"
import AnimatedGlobe from "../../components/AnimatedGlobe"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useAuth } from "../../hooks/useAuth"
import {
  getUpcomingRace,
  getPredictionComparison,
  getUserPicks,
  getUserScoreForRound,
} from "../../api/pitwall"

function isIndexingGap(upcomingRound?: string, comparisonRound?: number): boolean {
  if (!upcomingRound || !comparisonRound) return false
  return parseInt(upcomingRound) - comparisonRound > 1
}

function useCountdown(dateStr: string, timeStr: string) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0,
  })

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(`${dateStr}T${timeStr}`).getTime() - Date.now()
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
  }, [dateStr, timeStr])

  return timeLeft
}

export function ProcessingBanner({ raceName }: { raceName: string }) {
  return (
    <View
      className="border border-amber-500/30 rounded-2xl bg-amber-500/5 mb-4"
      style={{ padding: 7 }}
    >
      <View className="flex-row items-start gap-4">
        <View className="flex-shrink-0 mt-1 relative items-center justify-center">
          <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        </View>
        <View className="flex-1">
          <Text className="text-amber-400 font-black text-xs tracking-widest uppercase mb-1">
            Processing Race Results
          </Text>
          <Text className="text-white font-bold text-base mb-1">
            {raceName} results are being indexed
          </Text>
          <Text className="text-zinc-400 text-sm">
            Our AI is crunching the numbers. Scores and comparisons will appear automatically.
          </Text>
        </View>
      </View>
    </View>
  )
}

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const { data: race, isLoading: raceLoading } = useQuery({
    queryKey: ["upcoming-race"],
    queryFn: getUpcomingRace,
    staleTime: 10 * 60 * 1000,
  })

  const { data: comparison } = useQuery({
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
    select: (data) => data?.exists ? data.score : null,
  })

  const timeLeft = useCountdown(race?.date ?? "", race?.time ?? "")
  const userHasPicks = userPicksData?.exists ?? false

  const inGap = isIndexingGap(race?.round, (comparison as any)?.round)
  const upcomingRound = race?.round ? parseInt(race.round) : undefined
  const justFinishedLabel = inGap && upcomingRound ? `Round ${upcomingRound - 1}` : null

  if (raceLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 40 }}
    >
      {/* Header */}
      {/* <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-white text-3xl font-black leading-none">PITWALL</Text>
          <Text className="text-red-500 text-3xl font-black leading-none">AI</Text>
        </View>
        <View className="items-end">
          <View className="bg-red-500 rounded-full px-2.5 py-0.5 mb-1">
            <Text className="text-white text-[9px] font-bold uppercase tracking-widest">2026 Season</Text>
          </View>
          {race?.round && (
            <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Round {race.round}</Text>
          )}
        </View>
      </View> */}
      {/* HEADER */}

      <View className="mb-2">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-white text-4xl font-black tracking-tight">
              PITWALL
            </Text>

            <Text className="text-red-500 text-4xl font-black -mt-1">
              AI
            </Text>

            <Text className="text-zinc-500 mt-3 text-xs uppercase tracking-[3px]">
              Formula One Intelligence
            </Text>
          </View>

          <View className="items-end">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />

              <Text className="text-red-500 text-[10px] font-bold tracking-[2px] uppercase">
                LIVE
              </Text>
            </View>

            <Text className="text-zinc-500 text-[11px] mt-2">
              2026 Season
            </Text>

            {race?.round && (
              <Text className="text-white font-bold text-sm">
                Round {race.round}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Hero Section */}
      {/* <View className="border border-zinc-800 rounded-2xl p-5 bg-zinc-950 mb-4 relative overflow-hidden">
        <View
          pointerEvents="none"
          style={{ position: "absolute", right: -80, top: -30, opacity: 0.4 }}
        >
          <AnimatedGlobe size={330} />
        </View>

        <View className="mb-4 pr-24">
          <Text className="text-red-500 text-[10px] font-bold tracking-widest uppercase mb-1.5">Race Predictions</Text>
          <Text className="text-white text-2xl font-black mb-2">
            Your Pitwall <Text className="text-red-500">Super AI</Text>.{"\n"}
            <Text className="text-zinc-500 text-base font-normal">Before the lights go out.</Text>
          </Text>
          <Text className="text-zinc-400 text-xs leading-relaxed">
            Real-time F1 predictions powered by live session data, driver ratings, and car performance. Updated after every session.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(tabs)/race")}
          className="bg-red-500 rounded-xl py-3 items-center"
        >
          <Text className="text-white font-bold text-sm">
            View Race Predictions
          </Text>
        </TouchableOpacity>
      </View> */}
      <View>
        <View
          className="rounded overflow-hidden"
          style={{
            backgroundColor: "#090909",
            borderWidth: 1,
            borderColor: "#18181b",
            minHeight: 420,
          }}
        >
          {/* Globe */}

          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: -90,
              top: -70,
              opacity: 0.99,
            }}
          >
            <AnimatedGlobe size={420} />
          </View>

          <View style={{ padding: 7 }}>
            <Text
              className="text-zinc-500 uppercase text-[10px]"
              style={{
                letterSpacing: 3,
              }}
            >
              Formula One Prediction Engine
            </Text>

            <Text
              className="text-white font-black mt-5"
              style={{
                fontSize: 46,
                lineHeight: 50,
              }}
            >
              Your
            </Text>

            <Text
              className="text-white font-black"
              style={{
                fontSize: 46,
                lineHeight: 50,
              }}
            >
              Pitwall
            </Text>

            <Text
              className="text-red-500 font-black"
              style={{
                fontSize: 46,
                lineHeight: 50,
              }}
            >
              Super AI.
            </Text>

            <Text
              className="text-zinc-400 mt-8"
              style={{
                width: "65%",
                lineHeight: 22,
              }}
            >
              AI powered Formula One predictions built using telemetry,
              qualifying pace, race simulations and historical data.
            </Text>
          </View>

          <View
            className="mt-auto"
            style={{
              paddingHorizontal: 7,
              paddingBottom: 7,
            }}
          >
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/race")}
              className="bg-red-500 rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold text-base">
                View Race Predictions
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Post-race indexing gap banner */}
      {inGap && justFinishedLabel && (
        <ProcessingBanner raceName={justFinishedLabel} />
      )}

      {/* Upcoming Race */}
      {/* {race && (
        <View className="border border-zinc-800 rounded-2xl p-5 bg-zinc-950 mb-4">
          <Text className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase mb-3">Next Race</Text>

          <View className="mb-4">
            <Text className="text-white font-black text-2xl mb-1">{race.name}</Text>
            <Text className="text-zinc-400 text-xs">{race.circuit}</Text>
            <Text className="text-zinc-500 text-xs mt-1">{race.country} — Round {race.round}</Text>
            <Text className="text-zinc-600 text-[10px] mt-1.5 font-bold uppercase tracking-wider">
              {new Date(race.date).toLocaleDateString("en-GB", {
                weekday: "long", day: "numeric", month: "long", year: "numeric"
              })}
            </Text>
          </View>
          <View className="mb-5">
            <Text className="text-zinc-500 text-[10px] uppercase tracking-[2px] mb-5">
              Lights Out In
            </Text>

            <View className="flex-row items-end justify-center">

              <Text className="text-white text-5xl font-black">
                {String(timeLeft.days).padStart(2, "0")}
              </Text>
              <Text className="text-zinc-500 text-xs mb-2 mx-2">:</Text>

              <Text className="text-white text-5xl font-black">
                {String(timeLeft.hours).padStart(2, "0")}
              </Text>
              <Text className="text-zinc-500 text-xs mb-2 mx-2">:</Text>

              <Text className="text-white text-5xl font-black">
                {String(timeLeft.minutes).padStart(2, "0")}
              </Text>
              <Text className="text-zinc-500 text-xs mb-2 mx-2">:</Text>

              <Text className="text-red-500 text-5xl font-black">
                {String(timeLeft.seconds).padStart(2, "0")}
              </Text>

            </View>

            <View className="flex-row justify-center mt-2">
              <Text className="text-zinc-600 text-[10px] tracking-[3px] uppercase">
                DAYS&nbsp;&nbsp;&nbsp;&nbsp;HRS&nbsp;&nbsp;&nbsp;&nbsp;MIN&nbsp;&nbsp;&nbsp;&nbsp;SEC
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/race")}
            className="border border-red-500 rounded-xl py-3 items-center"
          >
            <Text className="text-red-500 font-bold text-sm">
              See Predictions for this Race
            </Text>
          </TouchableOpacity>
        </View>
      )} */}

      {/* ===========================
        NEXT RACE
=========================== */}

      {race && (
        <View
          className="mb-10"
          style={{
            borderTopWidth: 1,
            borderTopColor: "#27272a",
            padding: 7,
          }}
        >
          {/* Label */}

          <Text
            className="text-zinc-500 uppercase text-[10px] mb-3"
            style={{
              letterSpacing: 3,
            }}
          >
            Next Race
          </Text>

          {/* Race */}

          <Text
            className="text-white font-black"
            style={{
              fontSize: 34,
              lineHeight: 38,
            }}
          >
            {race.name}
          </Text>

          <Text
            className="text-zinc-400 mt-2"
            style={{
              fontSize: 16,
            }}
          >
            {race.circuit}
          </Text>

          <Text className="text-zinc-600 mt-1">
            {race.country}
          </Text>

          {/* Countdown */}

          <View className="mt-10">
            <Text
              className="text-zinc-600 uppercase text-[10px] mb-3"
              style={{
                letterSpacing: 3,
              }}
            >
              Lights Out In
            </Text>

            <View className="flex-row items-end">
              <Text className="text-white text-6xl font-black">
                {String(timeLeft.days).padStart(2, "0")}
              </Text>

              <Text className="text-zinc-600 text-2xl mx-2 mb-2">
                :
              </Text>

              <Text className="text-white text-6xl font-black">
                {String(timeLeft.hours).padStart(2, "0")}
              </Text>

              <Text className="text-zinc-600 text-2xl mx-2 mb-2">
                :
              </Text>

              <Text className="text-white text-6xl font-black">
                {String(timeLeft.minutes).padStart(2, "0")}
              </Text>

              <Text className="text-zinc-600 text-2xl mx-2 mb-2">
                :
              </Text>

              <Text className="text-red-500 text-6xl font-black">
                {String(timeLeft.seconds).padStart(2, "0")}
              </Text>
            </View>

            <View className="flex-row mt-2">
              <Text className="text-zinc-600 text-[10px] flex-1">
                DAYS
              </Text>

              <Text className="text-zinc-600 text-[10px] flex-1">
                HRS
              </Text>

              <Text className="text-zinc-600 text-[10px] flex-1">
                MIN
              </Text>

              <Text className="text-zinc-600 text-[10px] flex-1">
                SEC
              </Text>
            </View>
          </View>

          {/* Divider */}

          <View
            style={{
              height: 1,
              backgroundColor: "#27272a",
              marginVertical: 30,
            }}
          />

          {/* Race Data */}

          <View className="gap-4">
            <View className="flex-row justify-between">
              <Text className="text-zinc-500 uppercase text-[10px]">
                Round
              </Text>

              <Text className="text-white font-semibold">
                {race.round}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-zinc-500 uppercase text-[10px]">
                Weekend
              </Text>

              <Text className="text-white font-semibold">
                {new Date(race.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-zinc-500 uppercase text-[10px]">
                Circuit
              </Text>

              <Text className="text-white font-semibold">
                {race.circuit}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-zinc-500 uppercase text-[10px]">
                Status
              </Text>

              <Text className="text-green-400 font-semibold">
                Upcoming
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/race")}
            style={{
              marginTop: 32,
            }}
          >
            <Text
              className="text-red-500 font-bold"
              style={{
                fontSize: 16,
              }}
            >
              View Race Brief →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Can You Beat the AI */}
      <View
        className="border border-red-500/30 rounded-2xl bg-zinc-950 mb-4"
        style={{ padding: 7 }}
      >
        <View className="mb-4">
          <Text className="text-red-500 text-[10px] font-bold tracking-widest uppercase mb-1">New Challenge</Text>
          <Text className="text-white text-xl font-black mb-2">Can You Beat the F1-AI?</Text>
          <Text className="text-zinc-400 text-xs leading-relaxed">
            PitWall AI predicted the correct constructor for every podium position in the last GP. Think you can do better?
          </Text>
        </View>

        <View className="mb-4">
          {user ? (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/predictions")}
              className="bg-red-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold text-sm">
                {userHasPicks ? "View My Picks" : "Submit Picks"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="bg-red-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold text-sm">
                Sign In to Predict
              </Text>
            </TouchableOpacity>
          )}
          {user && (
            <Text className="text-zinc-500 text-[10px] text-center mt-1.5 font-semibold uppercase tracking-wider">
              {userHasPicks ? "Picks submitted for this race" : `Logged in as ${user.email?.split("@")[0]}`}
            </Text>
          )}
        </View>

        {/* Stats Grid */}
        {/* <View className="border-t border-zinc-800 pt-4 mt-2 gap-2">
          {inGap ? (
            <>
              <View>
                <Text className="text-xl font-black text-amber-500">—</Text>
                <Text className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">AI accuracy · results pending</Text>
              </View>
              <View className="mt-1">
                <Text className="text-zinc-400 text-xs">Last confirmed: {comparison?.race_name ?? "—"}</Text>
                <Text className="text-zinc-600 text-[10px] mt-0.5">Most recent race indexing in progress</Text>
              </View>
            </>
          ) : (
            <>
              <View className="flex-row justify-between items-center bg-zinc-900/50 rounded-xl px-4 py-2.5">
                <Text className="text-zinc-400 text-xs">AI Constructor Accuracy</Text>
                <Text className="text-red-500 font-black text-base">
                  {comparison?.constructor_correct_count ?? "?"}/{comparison?.total ?? 3}
                </Text>
              </View>

              <View className="flex-row justify-between items-center bg-zinc-900/50 rounded-xl px-4 py-2.5">
                <Text className="text-zinc-400 text-xs">AI Driver Accuracy</Text>
                <Text className="text-red-500 font-black text-base">
                  {comparison?.driver_correct_count ?? "?"}/{comparison?.total ?? 3}
                </Text>
              </View>

              {comparison?.available && (
                <View className="flex-row justify-between items-center bg-zinc-900/50 rounded-xl px-4 py-2.5">
                  <Text className="text-zinc-400 text-xs">Actual Podium</Text>
                  <Text className="text-teal-400 font-black text-sm">
                    {comparison.comparison?.map((c: any) => c.actual_driver).join(" · ")}
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between items-center bg-zinc-900/50 rounded-xl px-4 py-2.5">
                <Text className="text-zinc-400 text-xs">Your Score</Text>
                {userScore ? (
                  <Text className="text-green-400 font-black text-sm">{userScore.total_points} pts</Text>
                ) : user ? (
                  <Text className="text-zinc-500 font-semibold text-xs">No picks submitted</Text>
                ) : (
                  <TouchableOpacity onPress={() => router.push("/login")}>
                    <Text className="text-red-500 font-bold text-xs underline">Sign in to see</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View> */}
      </View>

      {/* Last Race Comparison */}
      {comparison?.available && !inGap && (
        <View
          className="border border-zinc-800 rounded-2xl bg-zinc-950 mb-4"
          style={{ padding: 7 }}
        >
          <Text className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase mb-1.5">
            Last Race AI predictions
          </Text>
          <Text className="text-white font-black text-xl mb-1">{comparison.race_name}</Text>
          <Text className="text-zinc-600 text-[10px] mb-4">
            Prediction locked after: {comparison.sessions_used?.join(", ")}
          </Text>

          <View className="mb-4">
            {comparison.comparison?.map((c: any) => (
              <View key={c.position} className={`border rounded-xl p-3 mb-2.5 bg-zinc-900/30 ${c.driver_correct ? "border-green-500/20" : "border-red-500/20"}`}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-zinc-800 rounded px-1.5 py-0.5">
                      <Text className="text-zinc-400 font-mono text-[10px] font-bold">P{c.position}</Text>
                    </View>
                    <Text className="text-zinc-400 text-xs font-semibold">Podium Comparison</Text>
                  </View>
                  <View className={`rounded-full px-2 py-0.5 ${c.driver_correct ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    <Text className={`text-[9px] font-black tracking-wider uppercase ${c.driver_correct ? "text-green-400" : "text-red-400"}`}>
                      {c.driver_correct ? "correct" : "wrong"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-0.5">AI PREDICTED</Text>
                    <Text className="text-white font-black text-sm">{c.predicted_driver}</Text>
                    <Text className="text-zinc-500 text-[10px] mt-0.5">{c.predicted_team}</Text>
                  </View>
                  <View className="flex-1 items-end">
                    <Text className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-0.5">ACTUAL RESULT</Text>
                    <Text className="text-white font-black text-sm">{c.actual_driver}</Text>
                    <Text className="text-zinc-500 text-[10px] mt-0.5">{c.actual_team}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View className="flex-row gap-4 pt-4 border-t border-zinc-800">
            <View className="flex-1">
              <Text className="text-xl font-black text-green-400">{comparison.constructor_correct_count}/{comparison.total}</Text>
              <Text className="text-zinc-500 text-[10px] font-semibold uppercase mt-0.5">Constructor accuracy</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-red-400">{comparison.driver_correct_count}/{comparison.total}</Text>
              <Text className="text-zinc-500 text-[10px] font-semibold uppercase mt-0.5">Driver accuracy</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  )
}