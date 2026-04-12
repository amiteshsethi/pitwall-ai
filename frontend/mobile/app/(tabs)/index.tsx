import { View, Text, ScrollView, ActivityIndicator } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { TouchableOpacity } from "react-native"
import { getUpcomingRace, getWeekendPredictions } from "../../api/pitwall"
import { useAuth } from "../../hooks/useAuth"

function useCountdown(dateStr: string, timeStr: string) {
  const [timeLeft, setTimeLeft] = React.useState({
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

import React, { useEffect } from "react"

export default function HomeScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const { data: race, isLoading: raceLoading } = useQuery({
    queryKey: ["upcoming-race"],
    queryFn: getUpcomingRace,
    staleTime: 10 * 60 * 1000,
  })

  const { data: prediction, isLoading: predLoading } = useQuery({
    queryKey: ["predictions", race?.circuit, race?.location],
    queryFn: () => getWeekendPredictions(race!.circuit, race!.location),
    enabled: !!race,
  })

  const timeLeft = useCountdown(race?.date ?? "", race?.time ?? "")
  const top3 = prediction?.predictions?.slice(0, 3) ?? []

  if (raceLoading || predLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#ef4444" size="large" />
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ padding: 24, paddingTop: 60 }}>

      {/* Header */}
      <View className="mb-8">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="bg-red-500 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-bold tracking-widest uppercase">
              2026 Season
            </Text>
          </View>
          <Text className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
            Round {race?.round}
          </Text>
        </View>
        <Text className="text-white text-4xl font-black leading-none">
          PITWALL
        </Text>
        <Text className="text-red-500 text-4xl font-black leading-none">
          AI
        </Text>
        {user && (
          <Text className="text-zinc-500 text-sm mt-2">
            Welcome back, {user.email?.split("@")[0]}
          </Text>
        )}
      </View>

      {/* Next Race Card */}
      {race && (
        <View className="border border-zinc-800 rounded-2xl p-5 bg-zinc-950 mb-4">
          <Text className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-3">
            Next Race
          </Text>
          <Text className="text-white font-black text-xl mb-1">{race.name}</Text>
          <Text className="text-zinc-500 text-sm mb-4">{race.circuit}</Text>

          {/* Countdown */}
          <View className="flex-row gap-3">
            {[
              { label: "D", value: timeLeft.days },
              { label: "H", value: timeLeft.hours },
              { label: "M", value: timeLeft.minutes },
              { label: "S", value: timeLeft.seconds },
            ].map(({ label, value }) => (
              <View key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 items-center min-w-[48px]">
                <Text className="text-red-500 font-black text-xl tabular-nums">
                  {String(value).padStart(2, "0")}
                </Text>
                <Text className="text-zinc-600 text-xs tracking-widest">{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* AI Prediction Snapshot */}
      {top3.length > 0 && (
        <View className="border border-zinc-800 rounded-2xl p-5 bg-zinc-950 mb-4">
          <Text className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-4">
            PitWall AI Predicts
          </Text>
          <View className="gap-2">
            {top3.map((driver, i) => (
              <View key={driver.driver_code} className="flex-row items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3">
                <Text className="text-zinc-600 font-black text-sm w-6">P{i + 1}</Text>
                <View className="flex-1">
                  <Text className="text-white font-black tracking-wider">{driver.driver_code}</Text>
                  <Text className="text-zinc-500 text-xs">{driver.team}</Text>
                </View>
                <Text className="text-red-500 font-black">{driver.win_probability}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/picks")}
        className="bg-red-500 rounded-xl py-4 items-center"
      >
        <Text className="text-white font-black text-base">
          Beat the AI
        </Text>
      </TouchableOpacity>

    </ScrollView>
  )
}