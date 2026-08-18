import { useEffect, useRef } from "react"

interface AnimatedGlobeProps {
  size?: number
  mode?: "inline" | "fixed"
  className?: string
}

const GRAD3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
]

const _perm = (() => {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  return perm
})()

function dot3(g: number[], x: number, y: number, z: number) {
  return g[0] * x + g[1] * y + g[2] * z
}

function snoise(x: number, y: number, z: number) {
  const F3 = 1 / 3
  const G3 = 1 / 6
  const s = (x + y + z) * F3
  const i = Math.floor(x + s)
  const j = Math.floor(y + s)
  const k = Math.floor(z + s)
  const t = (i + j + k) * G3
  const x0 = x - (i - t)
  const y0 = y - (j - t)
  const z0 = z - (k - t)
  let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1 }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1 }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1 }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1 }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
  }
  const x1 = x0 - i1 + G3
  const y1 = y0 - j1 + G3
  const z1 = z0 - k1 + G3
  const x2 = x0 - i2 + 2 * G3
  const y2 = y0 - j2 + 2 * G3
  const z2 = z0 - k2 + 2 * G3
  const x3 = x0 - 1 + 3 * G3
  const y3 = y0 - 1 + 3 * G3
  const z3 = z0 - 1 + 3 * G3
  const ii = i & 255
  const jj = j & 255
  const kk = k & 255
  const gi0 = _perm[ii + _perm[jj + _perm[kk]]] % 12
  const gi1 = _perm[ii + i1 + _perm[jj + j1 + _perm[kk + k1]]] % 12
  const gi2 = _perm[ii + i2 + _perm[jj + j2 + _perm[kk + k2]]] % 12
  const gi3 = _perm[ii + 1 + _perm[jj + 1 + _perm[kk + 1]]] % 12
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
  const n0 = t0 < 0 ? 0 : ((t0 *= t0), t0 * t0 * dot3(GRAD3[gi0], x0, y0, z0))
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
  const n1 = t1 < 0 ? 0 : ((t1 *= t1), t1 * t1 * dot3(GRAD3[gi1], x1, y1, z1))
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
  const n2 = t2 < 0 ? 0 : ((t2 *= t2), t2 * t2 * dot3(GRAD3[gi2], x2, y2, z2))
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
  const n3 = t3 < 0 ? 0 : ((t3 *= t3), t3 * t3 * dot3(GRAD3[gi3], x3, y3, z3))
  return 32 * (n0 + n1 + n2 + n3)
}

const NUM_POINTS = 4500
const SPHERE_RADIUS = 1.65
const FOV_HALF_TAN = Math.tan((75 * Math.PI / 180) / 2)

function generateSpherePoints(n: number) {
  const pts = new Float32Array(n * 3)
  const phi = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < n; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / n)
    const a = (2 * Math.PI * i) / phi
    pts[i * 3] = Math.sin(theta) * Math.cos(a)
    pts[i * 3 + 1] = Math.sin(theta) * Math.sin(a)
    pts[i * 3 + 2] = Math.cos(theta)
  }
  return pts
}

const BASE_POINTS = generateSpherePoints(NUM_POINTS)

export default function AnimatedGlobe({
  size = 420,
  mode = "inline",
  className = "",
}: AnimatedGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = mode === "fixed" ? canvas.parentElement : null
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const projected: Array<{ sx: number; sy: number; rz: number; dotR: number; t: number }> =
      new Array(NUM_POINTS)

    let animId = 0
    const startTime = performance.now()

    const getDimensions = () => {
      if (mode === "fixed" && container) {
        return {
          w: container.clientWidth,
          h: container.clientHeight,
        }
      }
      return { w: size, h: size }
    }

    const resize = () => {
      const { w, h } = getDimensions()
      if (w <= 0 || h <= 0) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()

    const observer =
      mode === "fixed" && container
        ? new ResizeObserver(() => resize())
        : undefined
    observer?.observe(container!)

    const render = (now: number) => {
      const { w, h } = getDimensions()
      if (w <= 0 || h <= 0) {
        if (!prefersReducedMotion) animId = requestAnimationFrame(render)
        return
      }

      const time = (now - startTime) * 0.001
      const cosY = Math.cos(time * 0.18)
      const sinY = Math.sin(time * 0.18)
      const cosX = Math.cos(time * 0.12)
      const sinX = Math.sin(time * 0.12)

      ctx.clearRect(0, 0, w, h)

      // Opaque black base — canvas is transparent by default and was showing white body
      if (mode === "fixed") {
        ctx.fillStyle = "#000000"
        ctx.fillRect(0, 0, w, h)
      }

      const cx = mode === "fixed" ? w * 0.55 : w / 2
      const cy = mode === "fixed" ? h * 0.42 : h / 2
      const gradRadius = mode === "fixed" ? Math.max(w, h) * 0.7 : w * 0.55
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, gradRadius)
      grad.addColorStop(
        0,
        mode === "fixed" ? "rgba(239, 68, 68, 0.35)" : "rgba(180, 20, 30, 0.18)",
      )
      grad.addColorStop(
        0.4,
        mode === "fixed" ? "rgba(127, 29, 29, 0.2)" : "rgba(0, 0, 0, 0)",
      )
      grad.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = "lighter"

      const displaySize =
        mode === "fixed" ? Math.max(w, h) * 1.35 : Math.min(w, h) * 1.5
      const screenScale = displaySize / 2 / FOV_HALF_TAN

      for (let i = 0; i < NUM_POINTS; i++) {
        let px = BASE_POINTS[i * 3]
        let py = BASE_POINTS[i * 3 + 1]
        let pz = BASE_POINTS[i * 3 + 2]

        const n = snoise(
          px * 0.5 + time * 0.15,
          py * 0.5 + time * 0.2,
          pz * 0.5 + time * 0.15,
        )

        px += n * 0.3
        py += n * 0.3
        pz += n * 0.3
        const inv = SPHERE_RADIUS / Math.sqrt(px * px + py * py + pz * pz)
        px *= inv
        py *= inv
        pz *= inv

        const rx = px * cosY + pz * sinY
        let rz = -px * sinY + pz * cosY
        const ry = py * cosX - rz * sinX
        rz = py * sinX + rz * cosX

        const camDist = 4 - rz
        const sx = cx + (rx / camDist) * screenScale
        const sy = cy - (ry / camDist) * screenScale

        const t = (n + 1) * 0.5
        const dotR = Math.max(0.5, (mode === "fixed" ? 1.2 : 1.0) + t * (mode === "fixed" ? 3.2 : 2.8))
        projected[i] = { sx, sy, rz, dotR, t }
      }

      projected.sort((a, b) => a.rz - b.rz)

      for (let i = 0; i < NUM_POINTS; i++) {
        const { sx, sy, dotR, t } = projected[i]
        const r = Math.round(180 + t * 75)
        const g = Math.round(20 + t * 30)
        const b = Math.round(30 + t * 40)
        const alpha = mode === "fixed" ? 0.42 + t * 0.5 : 0.28 + t * 0.38
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.beginPath()
        ctx.arc(sx, sy, dotR, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = "source-over"

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render)
      }
    }

    if (prefersReducedMotion) {
      render(performance.now())
    } else {
      animId = requestAnimationFrame(render)
    }

    return () => {
      cancelAnimationFrame(animId)
      observer?.disconnect()
    }
  }, [size, mode])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none block ${className}`}
      style={mode === "inline" ? { width: size, height: size } : undefined}
    />
  )
}
