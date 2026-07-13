import { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { useQuery } from "@tanstack/react-query"
import { getDriverStandings, getConstructorStandings } from "../../api/pitwall"

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

type Tab = "drivers" | "constructors"

export default function StandingsScreen() {
  const [tab, setTab] = useState<Tab>("drivers")

  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ["driver-standings"],
    queryFn: () => getDriverStandings(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: constructors, isLoading: constructorsLoading } = useQuery({
    queryKey: ["constructor-standings"],
    queryFn: () => getConstructorStandings(),
    staleTime: 10 * 60 * 1000,
  })

  const isLoading = driversLoading || constructorsLoading
  const maxDriverPts = drivers?.[0]?.points ?? 1
  const maxConstructorPts = constructors?.[0]?.points ?? 1

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
          2026 Season
        </Text>
        <Text
          className="text-white font-black"
          style={{ fontSize: 40, lineHeight: 44 }}
        >
          {tab === "drivers" ? "World Drivers'" : "World Constructors'"}
        </Text>
        <Text
          className="text-red-500 font-black"
          style={{ fontSize: 40, lineHeight: 44 }}
        >
          Championship
        </Text>
        <Text className="text-zinc-400 mt-2">Live standings</Text>
      </View>

      {/* Tabs */}
      <View
        className="flex-row gap-2 mb-6"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: "#27272a",
          paddingBottom: 0,
        }}
      >
        {(["drivers", "constructors"] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor: tab === t ? "#ef4444" : "transparent",
              marginBottom: -1,
            }}
          >
            <Text
              style={{
                color: tab === t ? "#ef4444" : "#71717a",
                fontWeight: "700",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="items-center py-20">
          <ActivityIndicator color="#ef4444" size="large" />
        </View>
      ) : (
        <View className="gap-2">

          {tab === "drivers" && drivers?.map((driver, i) => {
            const teamColor = TEAM_COLORS[driver.team] ?? "#71717a"
            const barWidth = (driver.points / maxDriverPts) * 100
            const gap = maxDriverPts - driver.points

            return (
              <View
                key={driver.driver}
                style={{
                  backgroundColor: i === 0 ? "#0d0d0d" : "#0a0a0a",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: i === 0 ? "#713f12" : "#18181b",
                  padding: 14,
                }}
              >
                <View className="flex-row items-center gap-3">
                  {/* Position */}
                  <View style={{ width: 28 }}>
                    {i === 0 ? (
                      <Text style={{ color: "#facc15", fontWeight: "900", fontSize: 18, textAlign: "center" }}>
                        1
                      </Text>
                    ) : (
                      <Text
                        style={{
                          color: i === 1 ? "#d4d4d8" : i === 2 ? "#92400e" : "#52525b",
                          fontWeight: "900",
                          fontSize: 15,
                          textAlign: "center",
                        }}
                      >
                        {driver.position ?? i + 1}
                      </Text>
                    )}
                  </View>

                  {/* Team color */}
                  <View
                    style={{
                      width: 3,
                      height: 36,
                      borderRadius: 2,
                      backgroundColor: teamColor,
                    }}
                  />

                  {/* Driver code */}
                  <Text className="text-white font-black text-sm tracking-wider" style={{ width: 38 }}>
                    {driver.driver}
                  </Text>

                  {/* Name + team */}
                  <View className="flex-1 min-w-0">
                    <Text className="text-white text-sm font-medium" numberOfLines={1}>
                      {driver.driver_name}
                    </Text>
                    <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                      {driver.team}
                    </Text>
                  </View>

                  {/* Points */}
                  <Text className="text-white font-black text-lg">{driver.points}</Text>
                </View>

                {/* Bar + gap */}
                <View className="flex-row items-center gap-3 mt-3">
                  <View
                    style={{
                      flex: 1,
                      height: 2,
                      backgroundColor: "#27272a",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: 2,
                        width: `${barWidth}%`,
                        backgroundColor: teamColor,
                        borderRadius: 1,
                      }}
                    />
                  </View>
                  <Text className="text-zinc-600 text-[10px]" style={{ width: 50, textAlign: "right" }}>
                    {i === 0 ? "LEADER" : `+${gap.toFixed(0)}`}
                  </Text>
                  {driver.wins > 0 && (
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: "#422006", borderWidth: 1, borderColor: "#713f12" }}
                    >
                      <Text className="text-yellow-400 text-[10px] font-black">{driver.wins}W</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}

          {tab === "constructors" && constructors?.map((constructor, i) => {
            const teamColor = TEAM_COLORS[constructor.team] ?? "#71717a"
            const barWidth = (constructor.points / maxConstructorPts) * 100

            return (
              <View
                key={constructor.team}
                style={{
                  backgroundColor: i === 0 ? "#0d0d0d" : "#0a0a0a",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: i === 0 ? "#713f12" : "#18181b",
                  padding: 14,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <Text
                    style={{
                      color: i === 0 ? "#facc15" : i === 1 ? "#d4d4d8" : i === 2 ? "#92400e" : "#52525b",
                      fontWeight: "900",
                      fontSize: 15,
                      width: 28,
                      textAlign: "center",
                    }}
                  >
                    {i + 1}
                  </Text>

                  <View
                    style={{
                      width: 3,
                      height: 36,
                      borderRadius: 2,
                      backgroundColor: teamColor,
                    }}
                  />

                  <Text className="text-white text-sm font-bold flex-1" numberOfLines={1}>
                    {constructor.team}
                  </Text>

                  <Text className="text-white font-black text-lg">{constructor.points}</Text>
                </View>

                <View className="flex-row items-center gap-3 mt-3">
                  <View
                    style={{
                      flex: 1,
                      height: 2,
                      backgroundColor: "#27272a",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: 2,
                        width: `${barWidth}%`,
                        backgroundColor: teamColor,
                        borderRadius: 1,
                      }}
                    />
                  </View>
                  {constructor.wins > 0 && (
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: "#422006", borderWidth: 1, borderColor: "#713f12" }}
                    >
                      <Text className="text-yellow-400 text-[10px] font-black">{constructor.wins}W</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}

        </View>
      )}
    </ScrollView>
  )
}