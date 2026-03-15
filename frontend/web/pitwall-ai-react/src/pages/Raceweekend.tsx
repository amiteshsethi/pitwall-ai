import { useEffect, useState } from "react";
import { getWeekendPredictions, getUpcomingRace } from "../api/pitwall";
import type { Prediction, UpcomingRace } from "../types";
import DriverCard from "../components/DriverCard";
import SessionBadge from "../components/SessionBadge";
import F1Loader from "../components/F1loader";
import TrackVisual from "../components/TrackVisual";

export default function RaceWeekend() {
  const [race, setRace] = useState<UpcomingRace | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!race) return;
    const calculate = () => {
      const diff = new Date(`${race.date}T${race.time}`).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };
    setTimeLeft(calculate());
    const timer = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(timer);
  }, [race]);

  const fetchPredictions = (track: string, location: string) => {
    setLoading(true);
    getWeekendPredictions(track, location)
      .then((data) => {
        setPrediction(data);
        setLastUpdated(new Date());
        setError(null);
      })
      .catch(() =>
        setError(
          "Failed to fetch predictions. Make sure the backend is running.",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getUpcomingRace()
      .then((data) => {
        setRace(data);
        fetchPredictions(data.circuit, data.location);
      })
      .catch(() => setError("Failed to fetch upcoming race."));
  }, []);

  if (!race) return <F1Loader type={loaderType} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-l-4 border-red-500 pl-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">
                2026 Season
              </span>
              <span className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
                Round {race.round}
              </span>
            </div>
            <h1 className="text-6xl font-black text-white leading-none mb-2">
              {race.name}
            </h1>
            <p className="text-zinc-400 text-lg">{race.circuit}</p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: "D", value: timeLeft.days },
              { label: "H", value: timeLeft.hours },
              { label: "M", value: timeLeft.minutes },
              { label: "S", value: timeLeft.seconds },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-center min-w-[42px]"
              >
                <p className="text-red-500 font-black text-lg tabular-nums leading-none">
                  {String(value).padStart(2, "0")}
                </p>
                <p className="text-zinc-600 text-xs tracking-widest">{label}</p>
              </div>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchPredictions(race.circuit, race.location)}
            className="border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-red-500 text-sm font-medium px-4 py-2 rounded-xl transition-all duration-300 cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>
      {/* </div> */}

      {/* Track Visual */}
      <TrackVisual circuitName={race.circuit} />

      {/* Error */}
      {error && (
        <div className="border border-red-900 bg-red-950 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loader */}
      {loading && <F1Loader type={loaderType} />}

      {/* Main content */}
      {!loading && prediction && (
        <div className="space-y-2">
          {/* Podium + Prediction Based On — side by side */}
          <div className="grid grid-cols-2 gap-6">
            {/* Predicted Podium */}
            <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
              <p className="text-zinc-300 text-xs font-semibold tracking-widest uppercase mb-6">
                Predicted Podium
              </p>
              <div className="space-y-3">
                {prediction.predictions.slice(0, 3).map((driver, i) => (
                  <div
                    key={driver.driver_code}
                    className="group relative overflow-hidden flex items-center gap-4 bg-zinc-900 border border-zinc-800 hover:border-red-500 rounded-xl px-4 py-3 transition-all duration-300 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="text-2xl font-black text-zinc-600 w-8">
                      P{i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-black text-lg tracking-wider">
                        {driver.driver_code}
                      </p>
                      <p className="text-zinc-500 text-xs">{driver.team}</p>
                    </div>
                    <span className="text-red-500 font-black text-xl">
                      {driver.win_probability}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prediction Based On */}
            <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
              <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-4">
                Prediction Based On
              </p>

              {/* Session badges or factor chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {prediction.session_count > 0
                  ? prediction.sessions_used.map((session) => (
                      <SessionBadge key={session} session={session} />
                    ))
                  : [
                      "Car Performance",
                      "Driver Skill",
                      "Points Momentum",
                      "Track History",
                    ].map((factor) => (
                      <span
                        key={factor}
                        className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700"
                      >
                        {factor}
                      </span>
                    ))}
              </div>

              {/* Status message */}
              {prediction.session_count === 0 && (
                <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 text-sm font-bold mb-1">
                    Pre-weekend baseline prediction
                  </p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    This prediction is based on car performance, driver skill
                    ratings and championship standings only. As{" "}
                    <span className="text-white font-semibold">
                      FP1, FP2, FP3 and Qualifying
                    </span>{" "}
                    sessions complete, PitWall AI will automatically update
                    predictions with real track pace data — making them
                    significantly more accurate.
                  </p>
                </div>
              )}

              {prediction.session_count > 0 && prediction.session_count < 4 && (
                <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-4 mb-4">
                  <p className="text-blue-400 text-sm font-bold mb-1">
                    Prediction updating
                  </p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Using data from{" "}
                    <span className="text-white font-semibold">
                      {prediction.session_count}
                    </span>{" "}
                    session{prediction.session_count > 1 ? "s" : ""} so far.
                    Predictions will sharpen further after{" "}
                    <span className="text-white font-semibold">Qualifying</span>{" "}
                    completes.
                  </p>
                </div>
              )}

              {prediction.sessions_used.includes("Qualifying") && (
                <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-4 mb-4">
                  <p className="text-green-400 text-sm font-bold mb-1">
                    Final pre-race prediction locked
                  </p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Qualifying data included. This is PitWall AI's most accurate
                    prediction for this race weekend.
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="border-t border-zinc-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Sessions used</span>
                  <span className="text-white font-semibold">
                    {prediction.session_count}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Last updated</span>
                  <span className="text-white font-semibold">
                    {lastUpdated?.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Country</span>
                  <span className="text-white font-semibold">
                    {race.country}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Grid */}
          <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
            <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-4">
              Full Grid Predictions
            </p>
            <div className="space-y-2">
              {prediction.predictions.map((driver, i) => (
                <DriverCard
                  key={driver.driver_code}
                  driver={driver}
                  position={i + 1}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
