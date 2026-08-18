import AnimatedGlobe from "./AnimatedGlobe"

export default function GlobeBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-black" aria-hidden>
      <AnimatedGlobe mode="fixed" className="absolute inset-0 w-full h-full" />
    </div>
  )
}
