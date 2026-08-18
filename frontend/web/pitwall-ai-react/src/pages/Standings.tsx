import { useEffect, useState } from "react"
import { getDriverStandings, getConstructorStandings } from "../api/pitwall"
import type { DriverStanding, ConstructorStanding } from "../types"
import F1Loader from "../components/F1loader"
import PageHeader from "../components/ui/PageHeader"
import TabBar from "../components/ui/TabBar"
import ListRow from "../components/ui/ListRow"
import { getPodiumColor, getTeamColor } from "../lib/theme"

type Tab = "drivers" | "constructors"

export default function Standings() {
  const [tab, setTab] = useState<Tab>("drivers")
  const [drivers, setDrivers] = useState<DriverStanding[]>([])
  const [constructors, setConstructors] = useState<ConstructorStanding[]>([])
  const [loading, setLoading] = useState(true)
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1)

  useEffect(() => {
    setLoading(true)
    Promise.all([getDriverStandings(), getConstructorStandings()])
      .then(([d, c]) => {
        setDrivers(d)
        setConstructors(c)
      })
      .finally(() => setLoading(false))
  }, [])

  const maxDriverPoints = drivers[0]?.points ?? 1
  const maxConstructorPoints = constructors[0]?.points ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="2026 Season"
        title={tab === "drivers" ? "World Drivers'" : "World Constructors'"}
        accent="Championship"
        subtitle="Live standings"
      />

      <TabBar
        tabs={[
          { id: "drivers", label: "Drivers" },
          { id: "constructors", label: "Constructors" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading && <F1Loader type={loaderType} />}

      {!loading && tab === "drivers" && (
        <div className="space-y-2">
          {drivers.map((driver, i) => (
            <ListRow
              key={driver.driver}
              position={
                <span style={{ color: getPodiumColor(i) }}>
                  {driver.position ?? "-"}
                </span>
              }
              team={driver.team}
              title={driver.driver}
              subtitle={`${driver.driver_name} · ${driver.team}`}
              meta={i === 0 ? "LEADER" : `+${(maxDriverPoints - driver.points).toFixed(0)}`}
              trailing={
                <div className="flex items-center gap-3 w-full sm:w-48">
                  <div
                    className="flex-1 rounded-full h-0.5"
                    style={{ backgroundColor: "#27272a" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(driver.points / maxDriverPoints) * 100}%`,
                        backgroundColor: getTeamColor(driver.team),
                      }}
                    />
                  </div>
                  <span className="text-white font-black text-sm w-10 text-right">
                    {driver.points}
                  </span>
                  {driver.wins > 0 && (
                    <span className="text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded-full hidden sm:inline">
                      {driver.wins}W
                    </span>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {!loading && tab === "constructors" && (
        <div className="space-y-2">
          {constructors.map((constructor, i) => (
            <ListRow
              key={constructor.team}
              position={
                <span style={{ color: getPodiumColor(i) }}>{i + 1}</span>
              }
              team={constructor.team}
              title={constructor.team}
              trailing={
                <div className="flex items-center gap-3 w-full sm:w-48">
                  <div
                    className="flex-1 rounded-full h-0.5"
                    style={{ backgroundColor: "#27272a" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(constructor.points / maxConstructorPoints) * 100}%`,
                        backgroundColor: getTeamColor(constructor.team),
                      }}
                    />
                  </div>
                  <span className="text-white font-black text-sm w-10 text-right">
                    {constructor.points}
                  </span>
                  {constructor.wins > 0 && (
                    <span className="text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded-full hidden sm:inline">
                      {constructor.wins}W
                    </span>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
