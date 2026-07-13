import { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { getUpcomingRace, getWeekendPredictions } from "../../api/pitwall"

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

const SESSION_COLORS: Record<string, { bg: string; text: string }> = {
  "Practice 1": { bg: "#1e3a5f", text: "#93c5fd" },
  "Practice 2": { bg: "#1e3a5f", text: "#93c5fd" },
  "Practice 3": { bg: "#1e3a5f", text: "#93c5fd" },
  "Sprint Qualifying": { bg: "#3b0764", text: "#d8b4fe" },
  "Sprint": { bg: "#3b0764", text: "#d8b4fe" },
  "Qualifying": { bg: "#713f12", text: "#fde68a" },
  "Race": { bg: "#7f1d1d", text: "#fca5a5" },
}

export default function RaceScreen() {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const { data: race, isLoading: raceLoading } = useQuery({
    queryKey: ["upcoming-race"],
    queryFn: getUpcomingRace,
    staleTime: 10 * 60 * 1000,
  })

  const { data: prediction, isLoading: predLoading } = useQuery({
    queryKey: ["predictions", race?.circuit, race?.location],
    queryFn: () => getWeekendPredictions(race!.circuit, race!.location),
    enabled: !!race,
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = raceLoading || predLoading
  const drivers = prediction?.predictions ?? []
  const top3 = drivers.slice(0, 3)
  const visibleDrivers = expanded ? drivers : drivers.slice(0, 8)

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 40 }}
    >
      {/* Page Header */}
      <View className="mb-8">
        <Text
          className="text-zinc-500 uppercase text-[10px] mb-3"
          style={{ letterSpacing: 3 }}
        >
          Race Weekend
        </Text>
        <Text
          className="text-white font-black"
          style={{ fontSize: 40, lineHeight: 44 }}
        >
          {race?.name ?? "Loading..."}
        </Text>
        <Text className="text-zinc-400 mt-2" style={{ fontSize: 15 }}>
          {race?.circuit}
        </Text>
        <View className="flex-row items-center gap-3 mt-2">
          <Text className="text-zinc-600 text-xs">Round {race?.round}</Text>
          <Text className="text-zinc-700">·</Text>
          <Text className="text-zinc-600 text-xs">{race?.country}</Text>
        </View>
      </View>

      {isLoading ? (
        <View className="items-center py-20">
          <ActivityIndicator color="#ef4444" size="large" />
          <Text className="text-zinc-500 text-sm mt-4">Fetching predictions...</Text>
        </View>
      ) : (
        <>
          {/* Sessions Used */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#27272a",
              paddingTop: 20,
              marginBottom: 28,
            }}
          >
            <Text
              className="text-zinc-500 uppercase text-[10px] mb-3"
              style={{ letterSpacing: 3 }}
            >
              Prediction Based On
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {prediction && prediction.session_count > 0
                ? prediction.sessions_used.map(s => {
                  const colors = SESSION_COLORS[s] ?? { bg: "#27272a", text: "#a1a1aa" }
                  return (
                    <View
                      key={s}
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                        {s}
                      </Text>
                    </View>
                  )
                })
                : ["Car Performance", "Driver Skill", "Points Momentum", "Track History"].map(f => (
                  <View key={f} className="rounded-full px-3 py-1 bg-zinc-800 border border-zinc-700">
                    <Text className="text-zinc-400 text-xs font-semibold">{f}</Text>
                  </View>
                ))
              }
            </View>

            {prediction?.session_count === 0 && (
              <View
                className="rounded-2xl mt-4"
                style={{
                  backgroundColor: "#1c1a00",
                  borderWidth: 1,
                  borderColor: "#713f12",
                  padding: 14,
                }}
              >
                <Text className="text-yellow-400 text-xs font-black uppercase tracking-widest mb-1">
                  Pre-Weekend Baseline
                </Text>
                <Text className="text-zinc-400 text-xs leading-relaxed">
                  Using car performance, driver skill and standings only. Updates after each session.
                </Text>
              </View>
            )}

            {prediction && prediction.session_count > 0 && !prediction.sessions_used.includes("Qualifying") && (
              <View
                className="rounded-2xl mt-4"
                style={{
                  backgroundColor: "#0d1f3c",
                  borderWidth: 1,
                  borderColor: "#1e3a5f",
                  padding: 14,
                }}
              >
                <Text className="text-blue-400 text-xs font-black uppercase tracking-widest mb-1">
                  Prediction Updating
                </Text>
                <Text className="text-zinc-400 text-xs leading-relaxed">
                  {prediction.session_count} session{prediction.session_count > 1 ? "s" : ""} in. Sharpens further after Qualifying.
                </Text>
              </View>
            )}

            {prediction?.sessions_used.includes("Qualifying") && (
              <View
                className="rounded-2xl mt-4"
                style={{
                  backgroundColor: "#052e16",
                  borderWidth: 1,
                  borderColor: "#166534",
                  padding: 14,
                }}
              >
                <Text className="text-green-400 text-xs font-black uppercase tracking-widest mb-1">
                  Final Pre-Race Prediction
                </Text>
                <Text className="text-zinc-400 text-xs leading-relaxed">
                  Qualifying included. Most accurate prediction for this weekend.
                </Text>
              </View>
            )}
          </View>

          {/* Predicted Podium */}
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
              Predicted Podium
            </Text>

            <View className="gap-3">
              {top3.map((driver, i) => {
                const teamColor = TEAM_COLORS[driver.team] ?? "#71717a"
                return (
                  <View
                    key={driver.driver_code}
                    className="flex-row items-center"
                    style={{
                      backgroundColor: "#0d0d0d",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#18181b",
                      padding: 14,
                    }}
                  >
                    <Text
                      style={{
                        color: i === 0 ? "#facc15" : i === 1 ? "#d4d4d8" : "#92400e",
                        fontWeight: "900",
                        fontSize: 22,
                        width: 36,
                      }}
                    >
                      P{i + 1}
                    </Text>

                    <View
                      style={{
                        width: 3,
                        height: 36,
                        borderRadius: 2,
                        backgroundColor: teamColor,
                        marginRight: 12,
                      }}
                    />

                    <View className="flex-1">
                      <Text className="text-white font-black text-base tracking-wider">
                        {driver.driver_code}
                      </Text>
                      <Text className="text-zinc-500 text-xs mt-0.5">{driver.team}</Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-red-500 font-black text-lg">
                        {driver.win_probability}%
                      </Text>
                      <Text className="text-zinc-600 text-[10px]">win prob</Text>
                    </View>
                  </View>
                )
              })}
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/predictions")}
              className="bg-red-500 rounded-2xl py-4 items-center mt-4"
            >
              <Text className="text-white font-black text-base">Can You Beat the AI?</Text>
            </TouchableOpacity>
          </View>

          {/* Full Grid */}
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
              Full Grid — {drivers.length} Drivers
            </Text>

            <View className="gap-2">
              {visibleDrivers.map((driver, i) => {
                const teamColor = TEAM_COLORS[driver.team] ?? "#71717a"
                const maxProb = drivers[0]?.win_probability ?? 1
                const barWidth = (driver.win_probability / maxProb) * 100

                return (
                  <View
                    key={driver.driver_code}
                    className="flex-row items-center gap-3"
                    style={{
                      backgroundColor: "#0d0d0d",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#18181b",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: i === 0 ? "#facc15" : i === 1 ? "#d4d4d8" : i === 2 ? "#92400e" : "#52525b",
                        fontWeight: "900",
                        fontSize: 13,
                        width: 22,
                        textAlign: "center",
                      }}
                    >
                      {i + 1}
                    </Text>

                    <View
                      style={{
                        width: 2,
                        height: 28,
                        borderRadius: 1,
                        backgroundColor: teamColor,
                      }}
                    />

                    <Text className="text-white font-black text-sm w-10 tracking-wider">
                      {driver.driver_code}
                    </Text>

                    <View className="flex-1">
                      <View
                        style={{
                          height: 3,
                          backgroundColor: "#27272a",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: 3,
                            width: `${barWidth}%`,
                            backgroundColor: teamColor,
                            borderRadius: 2,
                          }}
                        />
                      </View>
                    </View>

                    <Text className="text-zinc-400 text-xs font-bold w-10 text-right">
                      {driver.win_probability}%
                    </Text>
                  </View>
                )
              })}
            </View>

            {drivers.length > 8 && (
              <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                style={{ marginTop: 14, alignItems: "center" }}
              >
                <Text className="text-red-500 font-bold text-sm">
                  {expanded ? "Show Less" : `Show All ${drivers.length} Drivers`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}