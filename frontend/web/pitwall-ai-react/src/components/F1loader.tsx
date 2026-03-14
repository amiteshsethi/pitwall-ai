import { useEffect, useState } from 'react'

interface F1LoaderProps {
  type: number
}

// ── Type 1: Racing Lights Sequence ─────────────────────────
function RacingLights() {
  const [litCount, setLitCount] = useState(5)

  useEffect(() => {
    // Light up all 5, then turn off one by one
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setLitCount(prev => {
          if (prev <= 0) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 400)
      return () => clearInterval(interval)
    }, 800)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
              i < litCount
                ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/50'
                : 'bg-zinc-800 border-zinc-700'
            }`}
          />
        ))}
      </div>
      <p className="text-zinc-500 text-sm tracking-widest uppercase">
        Loading Predictions
      </p>
    </div>
  )
}

// ── Type 2: F1 Car Driving Across Screen ───────────────────
function DrivingCar() {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(prev => (prev >= 100 ? 0 : prev + 0.8))
    }, 16)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="w-full max-w-lg relative h-12 overflow-hidden">
        {/* Track line */}
        <div className="absolute bottom-3 left-0 right-0 h-px bg-zinc-700" />
        {/* Car */}
        <div
          className="absolute bottom-3 transition-none"
          style={{ left: `${position}%` }}
        >
          {/* Simple F1 car SVG */}
          <svg
            width="48"
            height="20"
            viewBox="0 0 48 20"
            fill="none"
            className="-mb-1"
          >
            {/* Body */}
            <rect x="8" y="6" width="28" height="8" rx="2" fill="#ef4444" />
            {/* Nose */}
            <polygon points="36,8 48,10 36,12" fill="#ef4444" />
            {/* Cockpit */}
            <rect x="18" y="4" width="10" height="6" rx="1" fill="#1f1f1f" />
            {/* Front wing */}
            <rect x="38" y="9" width="6" height="2" rx="1" fill="#dc2626" />
            {/* Rear wing */}
            <rect x="4" y="5" width="2" height="10" rx="1" fill="#dc2626" />
            <rect x="2" y="7" width="6" height="2" rx="1" fill="#dc2626" />
            {/* Wheels */}
            <circle cx="12" cy="15" r="3" fill="#27272a" stroke="#52525b" strokeWidth="1" />
            <circle cx="34" cy="15" r="3" fill="#27272a" stroke="#52525b" strokeWidth="1" />
            <circle cx="12" cy="5" r="3" fill="#27272a" stroke="#52525b" strokeWidth="1" />
            <circle cx="34" cy="5" r="3" fill="#27272a" stroke="#52525b" strokeWidth="1" />
          </svg>
          {/* Exhaust trail */}
          <div
            className="absolute top-1/2 right-full -translate-y-1/2 h-px bg-gradient-to-l from-red-500/40 to-transparent"
            style={{ width: '40px' }}
          />
        </div>
      </div>
      <p className="text-zinc-500 text-sm tracking-widest uppercase">
        Loading Predictions
      </p>
    </div>
  )
}

// ── Type 3: Pit Stop Countdown ─────────────────────────────
function PitStopCountdown() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 0.1)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <p className="text-zinc-500 text-xs tracking-widest uppercase">
        Pit Stop Timer
      </p>
      <p className="text-6xl font-black text-red-500 tabular-nums tracking-tight">
        {elapsed.toFixed(1)}s
      </p>
      <div className="flex gap-2 mt-2">
        {['FL', 'FR', 'RL', 'RR'].map((tyre, i) => (
          <div
            key={tyre}
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-500 ${
              elapsed > i * 0.6
                ? 'border-red-500 text-red-500 bg-red-500/10'
                : 'border-zinc-700 text-zinc-600'
            }`}
          >
            {tyre}
          </div>
        ))}
      </div>
      <p className="text-zinc-600 text-xs mt-2">Changing tyres...</p>
    </div>
  )
}

// ── Type 4: Tyre Compound Spinner ──────────────────────────
function TyreSpinner() {
  const compounds = [
    { label: 'S', color: 'border-red-500 text-red-500', name: 'Soft' },
    { label: 'M', color: 'border-yellow-400 text-yellow-400', name: 'Medium' },
    { label: 'H', color: 'border-white text-white', name: 'Hard' },
  ]
  const [active, setActive] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % 3)
    }, 700)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="flex gap-6 items-center">
        {compounds.map((c, i) => (
          <div
            key={c.label}
            className={`flex flex-col items-center gap-2 transition-all duration-300 ${
              active === i ? 'scale-125' : 'scale-90 opacity-40'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-xl ${c.color} ${
                active === i ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '1s' }}
            >
              {c.label}
            </div>
            <p className={`text-xs font-semibold ${active === i ? c.color.split(' ')[1] : 'text-zinc-600'}`}>
              {c.name}
            </p>
          </div>
        ))}
      </div>
      <p className="text-zinc-500 text-sm tracking-widest uppercase">
        Loading Predictions
      </p>
    </div>
  )
}

// ── Main F1Loader Component ────────────────────────────────
export default function F1Loader({ type }: F1LoaderProps) {
  switch (type) {
    case 1: return <RacingLights />
    case 2: return <DrivingCar />
    case 3: return <PitStopCountdown />
    case 4: return <TyreSpinner />
    default: return <RacingLights />
  }
}