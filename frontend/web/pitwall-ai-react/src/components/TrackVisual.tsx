import { useEffect, useState } from 'react'
import { CIRCUITS } from '../data/circuits'
import { getCircuitLapRecord } from '../api/pitwall'
import type { LapRecord, TrackVisualProps } from '../types'

export default function TrackVisual({ circuitName }: TrackVisualProps) {
  const [lapRecord, setLapRecord] = useState<LapRecord | null>(null)
  const circuit = CIRCUITS[circuitName]

  useEffect(() => {
    if (!circuit) return
    getCircuitLapRecord(circuit.circuitId)
      .then(setLapRecord)
      .catch(() => setLapRecord(null))
  }, [circuitName])

  if (!circuit) return null

  return (
    <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950 flex gap-8">

      {/* Left — Option 4: Track outline + inline stats */}
      <div className="flex items-center gap-4 flex-1">
        <svg viewBox="0 0 100 100" className="w-24 flex-shrink-0" fill="none">
          <path
            d="M20,50 Q20,20 50,20 L70,20 Q85,20 88,35 Q91,50 84,58 L78,64 Q70,72 62,68 L48,60 Q40,56 37,64 Q33,76 22,76 Q12,76 12,64 Z"
            stroke="#ef4444"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="20" cy="50" r="3" fill="#ef4444" />
        </svg>
        <div>
          <p className="text-white font-black text-xl tracking-wider">
            {circuit.location.toUpperCase()}
          </p>
          <p className="text-zinc-500 text-xs mt-1">
            {circuit.lapLengthKm} km · {circuit.turns} turns
          </p>
          {lapRecord && (
            <>
              <p className="text-red-500 font-bold text-sm mt-3">
                Lap record: {lapRecord.lap_record}
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                {lapRecord.lap_record_driver}, {lapRecord.lap_record_year}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-zinc-800" />

      {/* Right — Option 3: Stats grid */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {[
          { label: 'Lap length', value: `${circuit.lapLengthKm} km` },
          { label: 'Total laps', value: circuit.totalLaps },
          { label: 'Turns', value: circuit.turns },
          { label: 'Race distance', value: `${(circuit.lapLengthKm * circuit.totalLaps).toFixed(1)} km` },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center"
          >
            <p className="text-white font-black text-lg">{stat.value}</p>
            <p className="text-zinc-500 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

    </div>
  )
}