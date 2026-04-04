import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  getWeekendPredictions,
  getUpcomingRace,
  getUserStats,
  createUserPicks,
  updateUserPicks,
  getUserPicks,
} from "../api/pitwall";
import SessionBadge from "../components/SessionBadge";
import F1Loader from "../components/F1loader";

import { getUserScores } from "../api/pitwall";
import RaceScoreCard from "../components/RaceScoreCard";
import type { RaceScore } from "../types";

import { useQuery } from "@tanstack/react-query";

const ROOKIES_2026 = [
  { code: "ANT", name: "Andrea Kimi Antonelli", team: "Mercedes" },
  { code: "HAD", name: "Isack Hadjar", team: "Red Bull" },
  { code: "LIN", name: "Arvid Lindblad", team: "RB F1 Team" },
  { code: "BOR", name: "Gabriel Bortoleto", team: "Audi" },
  { code: "BEA", name: "Oliver Bearman", team: "Haas F1 Team" },
  { code: "COL", name: "Franco Colapinto", team: "Alpine F1 Team" },
];

export default function MyPicks() {
  const { user } = useAuth();
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1);
  const [p1Pick, setP1Pick] = useState("");
  const [p2Pick, setP2Pick] = useState("");
  const [p3Pick, setP3Pick] = useState("");
  const [rookiePick, setRookiePick] = useState("");
  const [existingPick, setExistingPick] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: race, isLoading: raceLoading } = useQuery({
    queryKey: ["upcoming-race"],
    queryFn: getUpcomingRace,
    staleTime: 10 * 60 * 1000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: () => getUserStats(user!.id),
    enabled: !!user,
  });

  const { data: prediction, isLoading: predictionsLoading } = useQuery({
    queryKey: ["predictions", race?.circuit, race?.location],
    queryFn: () => getWeekendPredictions(race!.circuit, race!.location),
    enabled: !!race,
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["user-scores", user?.id],
    queryFn: () => getUserScores(user!.id),
    enabled: !!user,
  });

  const { data: picksData } = useQuery({
  queryKey: ["user-picks", user?.id, race?.round],
  queryFn: () => getUserPicks(user!.id, parseInt(race!.round)),
  enabled: !!user && !!race,
})

useEffect(() => {
  if (picksData?.exists) {
    setExistingPick(picksData)
    setP1Pick(picksData.p1_pick ?? "")
    setP2Pick(picksData.p2_pick ?? "")
    setP3Pick(picksData.p3_pick ?? "")
    setRookiePick(picksData.rookie_pick ?? "")
  }
}, [picksData])

const isRaceWeek = race?.date
  ? new Date() >=
    new Date(new Date(race.date).getTime() - 7 * 24 * 60 * 60 * 1000)
  : false

  const isLocked =
    existingPick?.is_locked ||
    (prediction?.sessions_used?.includes("Qualifying") ?? false);

  const handleSubmit = async () => {
    if (!user || !race || !p1Pick || !p2Pick || !p3Pick || !rookiePick) return;

    if (p1Pick === p2Pick || p1Pick === p3Pick || p2Pick === p3Pick) {
      setError("Each position must have a different driver");
      return;
    }

    setSubmitting(true);
    setError(null);

    const pickData = {
      p1_pick: p1Pick,
      p2_pick: p2Pick,
      p3_pick: p3Pick,
      rookie_pick: rookiePick,
    };

    try {
      if (existingPick) {
        await updateUserPicks(user.id, parseInt(race.round), pickData);
      } else {
        await createUserPicks(user.id, parseInt(race.round), pickData);
      }

      setExistingPick((prev: any) => ({
        ...(prev || {}),
        ...pickData,
        is_locked: false,
      }));

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit picks");
    } finally {
      setSubmitting(false);
    }
  };
  if (raceLoading || statsLoading || predictionsLoading)
    return <F1Loader type={loaderType} />;

  const drivers = prediction?.predictions ?? [];
  const top3AI = drivers.slice(0, 3);

  const selectedDrivers = [p1Pick, p2Pick, p3Pick];

  const rookieGradient = {
    background:
      "radial-gradient(ellipse at top right, #3d0a0a 0%, #4e1414 60%)",
  };

  function daysUntil(dateStr: string) {
    return Math.ceil(
      (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
  }

  const driverSelect = (
    value: string,
    onChange: (v: string) => void,
    label: string,
  ) => (
    <div className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-red-500 rounded-xl p-4 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-2">
        {label}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLocked}
        className="w-full bg-transparent text-white font-bold text-lg outline-none cursor-pointer"
      >
        <option value="" className="bg-zinc-900">
          Select Driver
        </option>
        {drivers.map((d) => (
          <option
            key={d.driver_code}
            value={d.driver_code}
            disabled={
              selectedDrivers.includes(d.driver_code) && d.driver_code !== value
            }
            className="bg-zinc-900"
          >
            {d.driver_code} — {d.driver_name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── PAGE HEADER ── */}
      <div className="border-l-4 border-red-500 pl-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">
            2026 Season
          </span>
          <span className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
            Round {race?.round}
          </span>
        </div>
        <h1 className="text-5xl font-black text-white leading-none mb-1">
          Prediction Centre
        </h1>
        <p className="text-zinc-400 text-sm">
          Your picks, scores & AI predictions
        </p>
      </div>

      {/* ── SEASON STATS / PROFILE ── */}
      {stats && (
        <div
          className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950"
          style={ rookieGradient }
        >
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <span className="text-red-500 font-black text-sm">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-white font-black text-lg leading-none">
                  {user?.email?.split("@")[0]}
                </p>
                <p className="text-zinc-500 text-xs mt-1">{stats.tagline}</p>
              </div>
            </div>
            {stats.streak > 0 && (
              <div className="text-right">
                <p className="text-red-500 font-black text-2xl">
                  {stats.streak}
                </p>
                <p className="text-zinc-500 text-xs">race streak</p>
              </div>
            )}
          </div>

          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>Season points</span>
            <span className="text-white font-bold">
              {stats.total_points} pts
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-5">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((stats.total_points / 200) * 100, 100)}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-zinc-800">
            {[
              { label: "Total Points", value: stats.total_points },
              { label: "Races Entered", value: stats.races_entered },
              { label: "Avg Per Race", value: stats.avg_points || "—" },
              {
                label: "Best Race",
                value: stats.best_race ? `${stats.best_race_points}pts` : "—",
              },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-white font-black text-xl">{s.value}</p>
                <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NEXT RACE CARD ── */}
      {race && (
        <div className="border border-zinc-800 rounded-2xl p-5 bg-zinc-950">
          <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-3">
            Next race
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-black text-xl">{race.name}</p>
              <p className="text-zinc-500 text-sm mt-1">
                {race.circuit} · Round {race.round}
              </p>
            </div>
            {race.date && !isRaceWeek && (
              <div className="text-right">
                <p className="text-red-500 font-black text-3xl">
                  {daysUntil(race.date)}
                </p>
                <p className="text-zinc-500 text-xs">days away</p>
              </div>
            )}
            {isRaceWeek && (
              <span className="bg-green-500/10 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/20">
                Race Week
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── PREDICTION GATE ── */}
      {!isRaceWeek ? (
        <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-2xl p-5">
          <p className="text-yellow-400 font-bold text-sm mb-1">
            Predictions open race week
          </p>
          <p className="text-zinc-400 text-xs">
            Picks for the {race?.name} open on the race. Check
            back then to lock in your prediction.
          </p>
        </div>
      ) : (
        <>
          {/* ── PICKS LOCKED BANNER ── */}
          {isLocked && (
            <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4">
              <p className="text-yellow-400 text-sm font-bold">Picks Locked</p>
              <p className="text-zinc-400 text-xs mt-1">
                Qualifying has started / ended — your picks are locked in. Check
                back after the race for your score!
              </p>
            </div>
          )}

          {/* ── AI vs USER PREDICTIONS ── */}
          <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-1">
                  Make your prediction
                </p>
                <p className="text-white font-black text-lg">{race?.name}</p>
              </div>
              {isLocked && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  Locked
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mt-5">
              {/* AI Prediction */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
                    PitWall AI predicts
                  </p>
                  <div className="flex gap-1">
                    {prediction?.sessions_used.map((s) => (
                      <SessionBadge key={s} session={s} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {top3AI.map((driver, i) => (
                    <div
                      key={driver.driver_code}
                      className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3"
                    >
                      <span className="text-zinc-600 font-black text-sm w-6">
                        P{i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-white font-black tracking-wider text-sm">
                          {driver.driver_code}
                        </p>
                        <p className="text-zinc-500 text-xs">{driver.team}</p>
                      </div>
                      <span className="text-red-500 font-bold text-sm">
                        {driver.win_probability}%
                      </span>
                    </div>
                  ))}
                </div>
                {prediction?.session_count === 0 && (
                  <p className="text-zinc-600 text-xs mt-3">
                    Baseline prediction — updates after each session
                  </p>
                )}
              </div>

              {/* User Picks */}
              <div>
                <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-3">
                  Your prediction
                </p>
                <div className="space-y-2">
                  {driverSelect(p1Pick, setP1Pick, "P1 — Race Winner")}
                  {driverSelect(p2Pick, setP2Pick, "P2 — Second Place")}
                  {driverSelect(p3Pick, setP3Pick, "P3 — Third Place")}
                </div>
              </div>
            </div>
          </div>

          {/* ── ROOKIE SPOTLIGHT ── */}
          <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-950">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-1">
                  Rookie Spotlight
                </p>
                <h3 className="text-white font-black text-xl">
                  Top Rookie This Race?
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  AI doesn't predict this — it's all you
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-900 text-purple-300">
                Human Only
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {ROOKIES_2026.map((rookie) => (
                <button
                  key={rookie.code}
                  onClick={() => !isLocked && setRookiePick(rookie.code)}
                  disabled={isLocked}
                  style={
                    rookiePick === rookie.code
                      ? {
                          background:
                            "radial-gradient(ellipse at top right, #3d0a0a 0%, #4e1414 60%)",
                        }
                      : undefined
                  }
                  className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    rookiePick === rookie.code
                      ? "border-red-500"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                  }`}
                >
                  <p className="text-white font-black text-sm">{rookie.code}</p>
                  <p className="text-zinc-500 text-xs truncate">
                    {rookie.name}
                  </p>
                  <p className="text-zinc-600 text-xs">{rookie.team}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div className="border border-red-900 bg-red-950 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── SUBMIT / LOCKED STATE ── */}
          {isLocked ? (
            existingPick ? (
              <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-6 text-center">
                <p className="text-green-400 font-black text-lg mb-1">
                  Your Picks Are Locked In
                </p>
                <p className="text-zinc-400 text-sm mb-4">
                  Qualifying is done — no more changes allowed
                </p>
                <div className="flex justify-center gap-8">
                  {[
                    {
                      label: "P1 Pick",
                      value: existingPick.p1_pick,
                      color: "text-white",
                    },
                    {
                      label: "P2 Pick",
                      value: existingPick.p2_pick,
                      color: "text-white",
                    },
                    {
                      label: "P3 Pick",
                      value: existingPick.p3_pick,
                      color: "text-white",
                    },
                    {
                      label: "Rookie Pick",
                      value: existingPick.rookie_pick,
                      color: "text-purple-400",
                    },
                  ].map((p) => (
                    <div key={p.label}>
                      <p className={`${p.color} font-black text-xl`}>
                        {p.value}
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">{p.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-zinc-600 text-xs mt-4">
                  Check back after the race to see your score!
                </p>
              </div>
            ) : (
              <div className="border border-red-900 bg-red-950 rounded-xl p-6 text-center">
                <p className="text-red-400 font-black text-lg mb-1">
                  Picks Closed
                </p>
                <p className="text-zinc-400 text-sm">
                  Qualifying has finished — picks are no longer accepted for
                  this race.
                </p>
              </div>
            )
          ) : (
            <button
              onClick={handleSubmit}
              disabled={
                submitting || !p1Pick || !p2Pick || !p3Pick || !rookiePick
              }
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-xl transition-colors cursor-pointer"
            >
              {submitting
                ? "Submitting..."
                : submitted
                  ? "Picks Saved!"
                  : existingPick
                    ? "Update My Picks"
                    : p1Pick || p2Pick || p3Pick || rookiePick
                      ? "Submit My Picks"
                      : "Make Your Predictions Above"}
            </button>
          )}

          {submitted && !isLocked && (
            <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-4 text-center">
              <p className="text-green-400 font-bold">Picks submitted!</p>
              <p className="text-zinc-500 text-xs mt-1">
                Your picks are saved. Come back after the race to see your
                score!
              </p>
            </div>
          )}
        </>
      )}

      {/* ── PREVIOUS RACE SCORES ── */}
      {scores.length > 0 && (
        <div className="space-y-4" >
          <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
            Previous races
          </p>
          {scores.map((score: RaceScore) => (
            <RaceScoreCard key={score.id} score={score} />
          ))}
        </div>
      )}
    </div>
  );
}
