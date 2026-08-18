import { useEffect, useState } from "react"
import { CIRCUITS } from "../data/circuits"
import { getCircuitLapRecord } from "../api/pitwall"
import type { LapRecord, TrackVisualProps } from "../types"
import Section from "./ui/Section"

export default function TrackVisual({ circuitName }: TrackVisualProps) {
  const [lapRecord, setLapRecord] = useState<LapRecord | null>(null)
  const circuit = CIRCUITS[circuitName]

  useEffect(() => {
    if (!circuit) return
    getCircuitLapRecord(circuit.circuitId)
      .then(setLapRecord)
      .catch(() => setLapRecord(null))
  }, [circuitName, circuit])

  if (!circuit) return null

  return (
    <Section divider={false} className="rounded overflow-hidden mb-6" padding={false}>
      <div
        className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6"
        style={{
          backgroundColor: "#090909",
          border: "1px solid #18181b",
        }}
      >
        <div className="flex items-center gap-4 flex-1">
          <img
            src={circuit.trackImageUrl}
            alt={`${circuit.location} circuit map`}
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain flex-shrink-0 opacity-80 invert"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
          <div>
            <p className="text-white font-black text-lg sm:text-xl tracking-wider">
              {circuit.location.toUpperCase()}
            </p>
            <p className="inline-flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 bg-red-500/10 mt-1">
              Race-ready
            </p>
            <p className="text-zinc-500 text-xs mt-2">
              {circuit.lapLengthKm} km · {circuit.turns} turns
            </p>
            {lapRecord && (
              <>
                <p className="text-red-500 font-bold text-sm mt-3">
                  Lap record: {lapRecord.lap_record}
                </p>
                <p className="text-zinc-600 text-xs mt-1">
                  {lapRecord.lap_record_driver}, {lapRecord.lap_record_year}, {lapRecord.team}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="hidden lg:block w-px bg-[#27272a]" />

        <div className="grid grid-cols-2 gap-3 flex-1">
          {[
            { label: "Lap length", value: `${circuit.lapLengthKm} km` },
            { label: "Total laps", value: circuit.totalLaps },
            { label: "Turns", value: circuit.turns },
            {
              label: "Race distance",
              value: `${(circuit.lapLengthKm * circuit.totalLaps).toFixed(1)} km`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: "#0d0d0d", border: "1px solid #18181b" }}
            >
              <p className="text-white font-black text-lg">{stat.value}</p>
              <p className="text-zinc-500 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
