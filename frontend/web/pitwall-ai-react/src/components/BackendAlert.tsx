import { useEffect, useState } from "react"
import { STATUS_COLORS } from "../lib/theme"

export default function BackendAlert() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(`${import.meta.env.VITE_API_URL}/`, {
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          setIsVisible(false)
        }
      } catch {
        setIsVisible(true)
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] border-b backdrop-blur-sm"
      style={{
        backgroundColor: STATUS_COLORS.warning.bg,
        borderColor: STATUS_COLORS.warning.border,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <span
            className="mt-1 inline-flex h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: STATUS_COLORS.warning.text }}
          />
          <div className="flex-1">
            <h3
              className="text-xs font-black tracking-widest uppercase mb-1"
              style={{ color: STATUS_COLORS.warning.text }}
            >
              Backend Service Starting Up
            </h3>
            <p className="text-sm text-zinc-300">
              The prediction service is waking up (free tier spindown). Please{" "}
              <button
                onClick={() => window.location.reload()}
                className="underline font-semibold hover:text-white transition-colors cursor-pointer"
              >
                refresh this page
              </button>{" "}
              in 2-3 seconds. It may take up to 50 seconds to fully respond.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss alert"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
