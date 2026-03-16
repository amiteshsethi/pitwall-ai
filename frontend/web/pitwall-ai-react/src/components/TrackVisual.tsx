import { useEffect, useState } from "react";
import { CIRCUITS } from "../data/circuits";
import { getCircuitLapRecord } from "../api/pitwall";
import type { LapRecord, TrackVisualProps } from "../types";

export default function TrackVisual({ circuitName }: TrackVisualProps) {
  const [lapRecord, setLapRecord] = useState<LapRecord | null>(null);
  const circuit = CIRCUITS[circuitName];

  useEffect(() => {
    if (!circuit) return;
    getCircuitLapRecord(circuit.circuitId)
      .then(setLapRecord)
      .catch(() => setLapRecord(null));
  }, [circuitName]);

  if (!circuit) return null;

  return (
    <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950 flex gap-8">
      {/* Left — Option 4: Track outline + inline stats */}
      <div className="flex items-center gap-4 flex-1">
        <img
          src={circuit.trackImageUrl}
          alt={`${circuit.location} circuit map`}
          className="w-24 h-24 object-contain flex-shrink-0 opacity-80 invert"
          onError={(e) => {
            console.log("Image failed:", circuit.trackImageUrl);
            e.currentTarget.style.display = "none";
          }}
        />
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
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center"
          >
            <p className="text-white font-black text-lg">{stat.value}</p>
            <p className="text-zinc-500 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
