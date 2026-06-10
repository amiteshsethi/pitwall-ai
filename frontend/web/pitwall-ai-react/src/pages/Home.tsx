/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import {
  getUpcomingRace,
  // getWeekendPredictions,
  getPredictionComparison,
  getUserPicks,
  getUserScoreForRound,
} from "../api/pitwall"
import type {
  UpcomingRace,
  PredictionComparison
} from "../types"
import F1Loader from "../components/F1loader"
import { useCountdown } from "../hooks/customhooks"
import { useAuth } from "../hooks/useAuth"

// ---------------------------------------------------------------------------
// Gap detection
// upcoming=R7, comparison=R5 → Monaco (R6) just finished, not indexed yet
// ---------------------------------------------------------------------------
function isIndexingGap(upcomingRound?: string, comparisonRound?: number): boolean {
  if (!upcomingRound || !comparisonRound) return false
  return parseInt(upcomingRound) - comparisonRound > 1
}

// ---------------------------------------------------------------------------
// Shared banner — used on Home AND Leaderboard
// ---------------------------------------------------------------------------
export function ProcessingBanner({ raceName }: { raceName: string }) {
  return (
    <div className="border border-amber-500/30 rounded-2xl p-6 bg-amber-500/5">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
        </div>
        <div className="flex-1">
          <p className="text-amber-400 font-black text-sm tracking-widest uppercase mb-1">
            Processing Race Results
          </p>
          <p className="text-white font-bold text-lg mb-1">
            {raceName} results are being indexed
          </p>
          <p className="text-zinc-400 text-sm">
            Our AI is crunching the numbers. Scores and comparisons will appear
            automatically once the official results are indexed — usually within
            a few hours of the race finishing.
          </p>
        </div>
        <p className="flex-shrink-0 text-amber-500/60 text-xs font-semibold tracking-widest uppercase">
          Check back soon
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
export default function Home() {
  const { user } = useAuth()
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1)

  const { data: race, isLoading: raceLoading } = useQuery<UpcomingRace>({
    queryKey: ["upcoming-race"],
    queryFn: getUpcomingRace,
    staleTime: 10 * 60 * 1000,
  })

  const { data: comparison } = useQuery<PredictionComparison>({
    queryKey: ["comparison"],
    queryFn: getPredictionComparison,
    staleTime: 10 * 60 * 1000,
  })

  const { data: userPicksData } = useQuery({
    queryKey: ["user-picks", user?.id, race?.round],
    queryFn: () => getUserPicks(user!.id, parseInt(race!.round)),
    enabled: !!user && !!race,
    staleTime: 5 * 60 * 1000,
  })

  const { data: userScore } = useQuery({
    queryKey: ["user-score-last", user?.id, (comparison as any)?.round],
    queryFn: () => getUserScoreForRound(user!.id, (comparison as any).round),
    enabled: !!user && !!(comparison as any)?.round,
    staleTime: 10 * 60 * 1000,
    select: (data) => data?.exists ? data.score : null,
  })

  const timeLeft = useCountdown(race?.date ?? null, race?.time ?? null)
  const userHasPicks = userPicksData?.exists ?? false

  const inGap = isIndexingGap(race?.round, (comparison as any)?.round)
  const upcomingRound = race?.round ? parseInt(race.round) : undefined
  const justFinishedLabel = inGap && upcomingRound ? `Round ${upcomingRound - 1}` : null

  return (
    <div className="space-y-4">

      {/* Hero */}
      <div className="group relative overflow-hidden border border-zinc-800 rounded-2xl p-10 bg-zinc-950 hover:border-red-500 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        <div className="flex items-center justify-between">
          {/* Left side - Text content */}
          <div className="flex-1 max-w-2xl">
            <p className="text-red-500 text-sm font-semibold tracking-widest uppercase mb-3">Race Predictions</p>
            <h1 className="text-5xl font-black text-white mb-4">
              Your Pitwall <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent animate-pulse">
                  Super AI
                </span>
                <span className="absolute inset-0 blur-xl bg-red-500/50 animate-pulse" style={{ animationDuration: '2s' }} />
              </span>.<br />
              <span className="text-zinc-500">Before the lights go out.</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl">
              Real-time F1 predictions powered by live session data, driver skill
              ratings and 2026 car performance index. Updated after every FP, Sprint
              and Qualifying session.
            </p>
            <Link to="/race"
              className="inline-block mt-8 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-xl transition-colors">
              View Race Predictions
            </Link>
          </div>

          {/* Right side - Advanced AI Orb */}
          <div className="relative flex-shrink-0 w-80 h-80 ml-8">
            {/* Outermost energy wave rings */}
            <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping" style={{ animationDuration: '4s' }} />
            <div className="absolute inset-2 rounded-full border border-red-400/15 animate-ping" style={{ animationDuration: '5s', animationDelay: '0.5s' }} />
            
            {/* Rotating hexagonal patterns */}
            <div className="absolute inset-8 animate-spin" style={{ animationDuration: '20s' }}>
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <div
                  key={angle}
                  className="absolute top-1/2 left-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-red-500/30 to-transparent"
                  style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
                />
              ))}
            </div>

            {/* Outer orbital ring with multiple particles */}
            <div className="absolute inset-10 rounded-full border border-red-500/30 animate-spin" style={{ animationDuration: '10s' }}>
              {[0, 90, 180, 270].map((angle) => (
                <div
                  key={`outer-${angle}`}
                  className="absolute w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(140px)`
                  }}
                />
              ))}
            </div>

            {/* Counter-rotating middle ring */}
            <div className="absolute inset-16 rounded-full border-2 border-red-400/40 animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }}>
              {[45, 135, 225, 315].map((angle) => (
                <div
                  key={`middle-${angle}`}
                  className="absolute w-1.5 h-1.5 bg-red-400 rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(95px)`
                  }}
                />
              ))}
            </div>

            {/* Data stream particles - fast orbit */}
            <div className="absolute inset-20 animate-spin" style={{ animationDuration: '3s' }}>
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                <div
                  key={`data-${angle}`}
                  className="absolute w-1 h-1 bg-red-300 rounded-full opacity-60"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(70px)`
                  }}
                />
              ))}
            </div>

            {/* Pulsing energy layers */}
            <div className="absolute inset-24 rounded-full bg-gradient-to-br from-red-500/40 via-red-600/20 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-28 rounded-full bg-gradient-to-br from-red-400/30 via-red-500/15 to-transparent animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />

            {/* Rotating gear assembly - Outer gear */}
            <div className="absolute inset-32 animate-spin" style={{ animationDuration: '15s', animation: 'spin 15s linear infinite, pulse 2s ease-in-out infinite' }}>
              {/* Realistic gear teeth - 16 teeth */}
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i * 360) / 16
                return (
                  <div
                    key={`tooth-${i}`}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-48px)`,
                      transformOrigin: 'center'
                    }}
                  >
                    {/* Tooth with trapezoidal shape */}
                    <div className="relative w-5 h-8 shadow-2xl" 
                         style={{ 
                           clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                           background: 'linear-gradient(to bottom, #dc2626 0%, #b91c1c 40%, #991b1b 70%, #7f1d1d 100%)',
                           boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.6), inset 2px 0 4px rgba(255,100,100,0.3), 0 4px 8px rgba(220, 38, 38, 0.4)'
                         }}>
                      {/* Metallic shine */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-300/40 to-transparent" />
                      {/* Left edge highlight */}
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-red-300/60 via-red-400/40 to-transparent" />
                      {/* Right edge shadow */}
                      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-black/40 via-black/30 to-transparent" />
                      {/* Top highlight */}
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-200/30 to-transparent" />
                    </div>
                  </div>
                )
              })}
              
              {/* Outer gear body - metallic red rim */}
              <div className="absolute inset-0 rounded-full border-[6px] shadow-2xl" 
                   style={{ 
                     background: 'radial-gradient(circle at 30% 30%, #dc2626 0%, #b91c1c 20%, #991b1b 40%, #7f1d1d 70%, #450a0a 100%)',
                     borderColor: '#7f1d1d',
                     boxShadow: 'inset 0 0 30px rgba(0,0,0,0.7), inset -5px -5px 20px rgba(220, 38, 38, 0.3), inset 5px 5px 20px rgba(0,0,0,0.5), 0 0 40px rgba(220, 38, 38, 0.5)'
                   }}>
                {/* Inner rim detail */}
                <div className="absolute inset-3 rounded-full border-2 border-red-800/60" />
                {/* Circular grooves */}
                <div className="absolute inset-4 rounded-full border border-red-700/40" />
                <div className="absolute inset-5 rounded-full border border-red-600/30" />
                {/* Highlight arc */}
                <div className="absolute inset-2 rounded-full" style={{ background: 'radial-gradient(circle at 25% 25%, rgba(252, 165, 165, 0.2) 0%, transparent 50%)' }} />
              </div>
            </div>

            {/* Counter-rotating inner gear */}
            <div className="absolute inset-36 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse', animation: 'spin 12s linear infinite reverse, pulse 2.3s ease-in-out infinite' }}>
              {/* Realistic inner gear teeth - 12 teeth */}
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 360) / 12
                return (
                  <div
                    key={`inner-tooth-${i}`}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-33px)`
                    }}
                  >
                    {/* Smaller trapezoidal tooth */}
                    <div className="relative w-4 h-6 shadow-xl"
                         style={{ 
                           clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)',
                           background: 'linear-gradient(to bottom, #ef4444 0%, #dc2626 35%, #b91c1c 70%, #991b1b 100%)',
                           boxShadow: 'inset -1px 0 3px rgba(0,0,0,0.5), inset 1px 0 3px rgba(255,120,120,0.3), 0 3px 6px rgba(239, 68, 68, 0.3)'
                         }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-300/30 to-transparent" />
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-red-300/50 to-transparent" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-red-200/20" />
                    </div>
                  </div>
                )
              })}
              
              {/* Inner gear body */}
              <div className="absolute inset-0 rounded-full border-[5px] shadow-xl"
                   style={{ 
                     background: 'radial-gradient(circle at 40% 35%, #ef4444 0%, #dc2626 15%, #b91c1c 35%, #991b1b 60%, #7f1d1d 100%)',
                     borderColor: '#991b1b',
                     boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6), inset -3px -3px 15px rgba(239, 68, 68, 0.3), inset 3px 3px 15px rgba(0,0,0,0.4), 0 0 30px rgba(239, 68, 68, 0.4)'
                   }}>
                <div className="absolute inset-2 rounded-full border border-red-700/50" />
                <div className="absolute inset-3 rounded-full border border-red-600/30" />
                <div className="absolute inset-2 rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(252, 165, 165, 0.15) 0%, transparent 40%)' }} />
              </div>
            </div>

            {/* Core mechanical center with breathing effect */}
            <div className="absolute inset-40 animate-pulse" style={{ animationDuration: '2s' }}>
              <div className="relative w-full h-full">
                {/* Main hub with red metallic finish */}
                <div className="absolute inset-0 rounded-full border-[4px] shadow-2xl"
                     style={{
                       background: 'radial-gradient(circle at 35% 30%, #fca5a5 0%, #f87171 10%, #ef4444 20%, #dc2626 35%, #b91c1c 50%, #991b1b 70%, #7f1d1d 85%, #450a0a 100%)',
                       borderColor: '#b91c1c',
                       boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), inset -4px -4px 20px rgba(252, 165, 165, 0.3), inset 4px 4px 20px rgba(0,0,0,0.5), 0 0 60px rgba(239, 68, 68, 0.6)'
                     }}>
                  
                  {/* Central energy core */}
                  <div className="absolute inset-3 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-700 shadow-2xl shadow-red-500/80">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-red-300/50 to-transparent" />
                    <div className="absolute inset-1 rounded-full border border-red-400/40" />
                  </div>
                  
                  {/* Bright highlight */}
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/50 blur-lg" />
                  
                  {/* Inner bright core */}
                  <div className="absolute inset-1/4 rounded-full bg-gradient-to-br from-red-300 via-red-400 to-red-600">
                    <div className="absolute inset-1/3 rounded-full bg-red-400 blur-sm" />
                  </div>
                </div>

                {/* Mechanical hex bolts - dark metallic */}
                {[0, 90, 180, 270].map((angle) => (
                  <div
                    key={`bolt-${angle}`}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-26px)`
                    }}
                  >
                    {/* Hex bolt head */}
                    <div className="relative w-3 h-3 shadow-lg"
                         style={{ 
                           clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
                           background: 'linear-gradient(135deg, #52525b 0%, #3f3f46 30%, #27272a 70%, #18181b 100%)',
                           boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 2px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.6), 0 0 0 1px rgba(127, 29, 29, 0.3)'
                         }}>
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-400/20 to-transparent" />
                    </div>
                    {/* Bolt center indent */}
                    <div className="absolute top-1/2 left-1/2 w-1 h-1 -mt-0.5 -ml-0.5 rounded-full bg-zinc-950 border border-zinc-800" />
                  </div>
                ))}
              </div>
            </div>

            {/* Massive breathing glow halos */}
            <div className="absolute inset-20 rounded-full bg-red-500/40 blur-3xl animate-pulse" style={{ animationDuration: '2s', transform: 'scale(1)' }} />
            <div className="absolute inset-16 rounded-full bg-red-600/20 blur-2xl animate-pulse" style={{ animationDuration: '2.3s', animationDelay: '0.3s', transform: 'scale(1)' }} />
            <div className="absolute inset-12 rounded-full bg-red-500/10 blur-3xl animate-pulse" style={{ animationDuration: '2.6s', animationDelay: '0.6s', transform: 'scale(1)' }} />
            
            {/* Energy burst particles - outer */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '5s' }}>
              {[0, 72, 144, 216, 288].map((angle) => (
                <div
                  key={`burst-${angle}`}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(150px)`
                  }}
                >
                  <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
                </div>
              ))}
            </div>

            {/* Technical grid overlay */}
            <div className="absolute inset-12 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-red-500" strokeDasharray="4 4" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-red-500" strokeDasharray="3 3" />
                <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-red-500" strokeDasharray="2 2" />
                <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.3" className="text-red-500" strokeDasharray="2 2" />
                <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.3" className="text-red-500" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {raceLoading && <F1Loader type={loaderType} />}

      {!raceLoading && (
        <>
          {/* Post-race indexing gap banner */}
          {inGap && justFinishedLabel && (
            <ProcessingBanner raceName={justFinishedLabel} />
          )}

          {/* Can You Beat the AI */}
          <div className="group relative overflow-hidden border border-red-500/30 hover:border-red-500 rounded-2xl p-8 transition-all duration-300"
            style={{ background: "radial-gradient(ellipse at top right, #3d0a0a 0%, #4e1414 60%)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-500 text-xs font-semibold tracking-widest uppercase mb-2">New Challenge</p>
                <h2 className="text-3xl font-black text-white mb-2">Can You Beat the SUPER Powered F1-AI?</h2>
                <p className="text-zinc-400 text-sm max-w-lg">
                  PitWall AI predicted the correct constructor for every podium position in the last GP.
                  Think you can do better? Submit your picks before qualifying locks and find out.
                </p>
              </div>
              <div className="flex-shrink-0 ml-8">
                {user ? (
                  <Link to="/picks" className="flex flex-col items-center gap-1">
                    <div className="bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 rounded-xl transition-colors text-lg">
                      {userHasPicks ? "View My Picks" : "Submit Picks"}
                    </div>
                    <p className="text-zinc-600 text-xs">
                      {userHasPicks ? "Picks submitted for this race" : `Logged in as ${user.email?.split("@")[0]}`}
                    </p>
                  </Link>
                ) : (
                  <Link to="/login" className="flex flex-col items-center gap-2">
                    <div className="bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 rounded-xl transition-colors text-lg">
                      Sign In to Predict
                    </div>
                    <p className="text-zinc-600 text-xs">Free · No credit card needed</p>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex gap-8 mt-6 pt-6 border-t border-zinc-800">
              {inGap ? (
                // Gap state — stale data, show placeholder
                <>
                  <div>
                    <p className="text-2xl font-black text-amber-500">—</p>
                    <p className="text-zinc-500 text-xs mt-1">AI accuracy · results pending</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-xs">Last confirmed: {comparison?.race_name ?? "—"}</p>
                    <p className="text-zinc-600 text-xs mt-0.5">Most recent race indexing in progress</p>
                  </div>
                </>
              ) : (
                // Normal state
                <>
                  <div>
                    <p className="text-2xl font-black text-red-500">
                      {comparison?.constructor_correct_count ?? "?"}/{comparison?.total ?? 3}
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">
                      AI constructor accuracy · {comparison?.race_name ?? "Last race"}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-red-500">
                      {comparison?.driver_correct_count ?? "?"}/{comparison?.total ?? 3}
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">
                      AI driver accuracy · {comparison?.race_name ?? "Last race"}
                    </p>
                  </div>
                  {comparison?.available && (
                    <div>
                      <p className="text-2xl font-black text-teal-400">
                        {comparison.comparison?.map(c => c.actual_driver).join(" · ")}
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">Actual podium · {comparison.race_name}</p>
                    </div>
                  )}
                  <div>
                    {userScore ? (
                      <>
                        <p className="text-2xl font-black text-green-400">{userScore.total_points} pts</p>
                        <p className="text-zinc-500 text-xs mt-1">Your score · {comparison?.race_name}</p>
                      </>
                    ) : user ? (
                      <>
                        <p className="text-2xl font-black text-zinc-400">—</p>
                        <p className="text-zinc-500 text-xs mt-1">No picks submitted · {comparison?.race_name}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-black text-zinc-400">?</p>
                        <p className="text-zinc-500 text-xs mt-1">Sign in to see your score</p>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Upcoming Race */}
          {race && (
            <div className="group relative overflow-hidden border border-zinc-800 rounded-2xl p-8 bg-zinc-950 hover:border-red-500 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-4">Next Race</p>
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white mb-1">{race.name}</h2>
                  <p className="text-zinc-400 text-sm">{race.circuit}</p>
                  <p className="text-zinc-500 text-sm mt-1">{race.country} — Round {race.round}</p>
                  <p className="text-zinc-600 text-xs mt-2">
                    {new Date(race.date).toLocaleDateString("en-GB", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric"
                    })}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Days", value: timeLeft.days },
                  { label: "Hours", value: timeLeft.hours },
                  { label: "Minutes", value: timeLeft.minutes },
                  { label: "Seconds", value: timeLeft.seconds },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-4xl font-black text-red-500 tabular-nums">
                      {String(value).padStart(2, "0")}
                    </p>
                    <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <Link to="/race"
                className="inline-block border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-semibold px-6 py-2 rounded-xl transition-colors text-sm">
                See Predictions for this Race
              </Link>
            </div>
          )}

          {/* Last Race Comparison — hidden during gap, muted if stale */}
          {comparison?.available && !inGap && (
            <div className="group relative overflow-hidden border border-zinc-800 rounded-2xl p-8 bg-zinc-950 hover:border-red-500 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-2">
                Last Race AI predictions — {comparison.race_name}
              </p>
              <p className="text-zinc-600 text-xs mb-6">
                Prediction locked after: {comparison.sessions_used?.join(", ")}
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-zinc-400 text-sm font-semibold mb-3">PitWall AI Predicted</p>
                  <div className="space-y-2">
                    {comparison.comparison?.map(c => (
                      <div key={c.position} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-2">
                        <span className="text-zinc-500 font-black text-sm w-6">P{c.position}</span>
                        <span className="text-white font-black text-sm tracking-wider">{c.predicted_driver}</span>
                        <span className="text-zinc-500 text-xs">{c.predicted_team}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-zinc-400 text-sm font-semibold mb-3">Actual Result</p>
                  <div className="space-y-2">
                    {comparison.comparison?.map(c => (
                      <div key={c.position}
                        className={`flex items-center gap-3 rounded-xl px-4 py-2 border ${c.driver_correct
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-red-500/5 border-red-500/20"}`}>
                        <span className="text-zinc-500 font-black text-sm w-6">P{c.position}</span>
                        <span className="text-white font-black text-sm tracking-wider">{c.actual_driver}</span>
                        <span className="text-zinc-500 text-xs flex-1">{c.actual_team}</span>
                        <span className={`text-xs font-bold ${c.driver_correct ? "text-green-400" : "text-red-400"}`}>
                          {c.driver_correct ? "correct" : "wrong"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-6 mt-6 pt-4 border-t border-zinc-800">
                <div>
                  <p className="text-2xl font-black text-green-400">{comparison.constructor_correct_count}/{comparison.total}</p>
                  <p className="text-zinc-500 text-xs mt-1">Constructor accuracy</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-red-400">{comparison.driver_correct_count}/{comparison.total}</p>
                  <p className="text-zinc-500 text-xs mt-1">Driver accuracy</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}