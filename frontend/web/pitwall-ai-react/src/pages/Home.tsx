import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getUpcomingRace,
  getWeekendPredictions,
  getPredictionComparison,
} from "../api/pitwall";
import type { UpcomingRace, PredictionComparison } from "../types";
import F1Loader from "../components/F1loader";
import { useCountdown } from "../hooks/customhooks";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { user } = useAuth();
  const [race, setRace] = useState<UpcomingRace | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1);
  const [comparison, setComparison] = useState<PredictionComparison | null>(
    null,
  );

  const timeLeft = useCountdown(race?.date ?? null, race?.time ?? null);

  useEffect(() => {
    Promise.all([getUpcomingRace(), getPredictionComparison()])
      .then(([r, c]) => {
        setRace(r);
        setComparison(c);
        getWeekendPredictions(r.circuit, r.location).then((p) =>
          setSessionCount(p.session_count),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-2">
      {/* Hero */}
      <div className="group relative overflow-hidden border border-zinc-800 rounded-2xl p-10 bg-zinc-950 hover:border-red-500 transition-all duration-300 cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <p className="text-red-500 text-sm font-semibold tracking-widest uppercase mb-3">
          Race Predictions
        </p>
        <h1 className="text-5xl font-black text-white mb-4">
          Your Pitwall Super AI.
          <br />
          <span className="text-zinc-500">Before the lights go out.</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl">
          Real-time F1 predictions powered by live session data, driver skill
          ratings and 2026 car performance index. Updated after every FP, Sprint
          and Qualifying session.
        </p>
        <Link
          to="/race"
          className="inline-block mt-8 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          View Race Predictions
        </Link>
      </div>
      <div className="group relative overflow-hidden border border-red-500/30 hover:border-red-500 rounded-2xl p-8 bg-zinc-950 transition-all duration-300 cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">
              New Challenge
            </p>
            <h2 className="text-3xl font-black text-white mb-2">
              Can You Beat the AI?
            </h2>
            <p className="text-zinc-400 text-sm max-w-lg">
              PitWall AI predicted the correct constructor for every podium
              position in the last GP. Think you can do better? Submit your
              picks before qualifying locks and find out.
            </p>
          </div>

          <div className="flex-shrink-0 ml-8">
            {user ? (
              <Link to="/picks" className="flex flex-col items-center gap-1">
                <div className="bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 rounded-xl transition-colors text-lg">
                  Submit Picks
                </div>
                <p className="text-zinc-600 text-xs">
                  Logged in as {user.email?.split("@")[0]}
                </p>
              </Link>
            ) : (
              <Link to="/login" className="flex flex-col items-center gap-2">
                <div className="bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 rounded-xl transition-colors text-lg">
                  Sign In to Predict
                </div>
                <p className="text-zinc-600 text-xs">
                  Free · No credit card needed
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* AI vs Human stat */}
        <div className="flex gap-8 mt-6 pt-6 border-t border-zinc-800">
          <div>
            <p className="text-2xl font-black text-red-500">3/3</p>
            <p className="text-zinc-500 text-xs mt-1">
              AI constructor accuracy · Chinese GP
            </p>
          </div>
          <div>
            <p className="text-2xl font-black text-zinc-400">?/3</p>
            <p className="text-zinc-500 text-xs mt-1">
              Your accuracy · Submit picks to find out
            </p>
          </div>
        </div>
      </div>

      {/* Loader */}
      {loading && <F1Loader type={loaderType} />}

      {/* Upcoming Race Card */}
      {!loading && race && (
        <div className="group relative overflow-hidden border border-zinc-800 rounded-2xl p-8 bg-zinc-950 hover:border-red-500 transition-all duration-300 cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-4">
            Next Race
          </p>

          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-white mb-1">
                {race.name}
              </h2>
              <p className="text-zinc-400 text-sm">{race.circuit}</p>
              <p className="text-zinc-500 text-sm mt-1">
                {race.country} — Round {race.round}
              </p>
              <p className="text-zinc-600 text-xs mt-2">
                {new Date(race.date).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Days", value: timeLeft.days },
              { label: "Hours", value: timeLeft.hours },
              { label: "Minutes", value: timeLeft.minutes },
              { label: "Seconds", value: timeLeft.seconds },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center"
              >
                <p className="text-4xl font-black text-red-500 tabular-nums">
                  {String(value).padStart(2, "0")}
                </p>
                <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mt-1">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <Link
            to="/race"
            className="inline-block border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-semibold px-6 py-2 rounded-xl transition-colors text-sm"
          >
            See Predictions for this Race
          </Link>
        </div>
      )}

      {/* Stats Row */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Prediction Factors", value: "6" },
            { label: "Sessions Tracked", value: sessionCount.toString() },
            { label: "Podium Accuracy", value: "100%" },
            { label: "2026 Season", value: "LIVE" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden border border-zinc-800 rounded-xl p-6 bg-zinc-950 text-center hover:border-red-500 transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <p className="text-4xl font-black text-white mb-1">
                {stat.value}
              </p>
              <p className="text-zinc-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Predictions */}
      {!loading && comparison?.available && (
        <div className="group relative overflow-hidden border border-zinc-800 rounded-2xl p-8 bg-zinc-950 hover:border-red-500 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-2">
            Last Race — {comparison.race_name}
          </p>
          <p className="text-zinc-600 text-xs mb-6">
            Prediction locked after: {comparison.sessions_used?.join(", ")}
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-zinc-400 text-sm font-semibold mb-3">
                PitWall AI Predicted
              </p>
              <div className="space-y-2">
                {comparison.comparison?.map((c) => (
                  <div
                    key={c.position}
                    className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-2"
                  >
                    <span className="text-zinc-500 font-black text-sm w-6">
                      P{c.position}
                    </span>
                    <span className="text-white font-black text-sm tracking-wider">
                      {c.predicted_driver}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      {c.predicted_team}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-zinc-400 text-sm font-semibold mb-3">
                Actual Result
              </p>
              <div className="space-y-2">
                {comparison.comparison?.map((c) => (
                  <div
                    key={c.position}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2 border ${
                      c.correct
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-red-500/5 border-red-500/20"
                    }`}
                  >
                    <span className="text-zinc-500 font-black text-sm w-6">
                      P{c.position}
                    </span>
                    <span className="text-white font-black text-sm tracking-wider">
                      {c.actual_driver}
                    </span>
                    <span className="text-zinc-500 text-xs flex-1">
                      {c.actual_team}
                    </span>
                    <span
                      className={`text-xs font-bold ${c.correct ? "text-green-400" : "text-red-400"}`}
                    >
                      {c.correct ? "correct" : "wrong"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-zinc-600 text-xs mt-6">
            PitWall AI got {comparison.driver_correct_count}/{comparison.total}{" "}
            podium positions correct
          </p>
          <div className="flex gap-6 mt-6">
            <div>
              <p className="text-2xl font-black text-green-400">
                {comparison.constructor_correct_count}/{comparison.total}
              </p>
              <p className="text-zinc-500 text-xs mt-1">Constructor accuracy</p>
            </div>
            <div>
              <p className="text-2xl font-black text-red-400">
                {comparison.driver_correct_count}/{comparison.total}
              </p>
              <p className="text-zinc-500 text-xs mt-1">Driver accuracy</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
