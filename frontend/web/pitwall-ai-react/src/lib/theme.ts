export const TEAM_COLORS: Record<string, string> = {
  Mercedes: "#2dd4bf",
  Ferrari: "#ef4444",
  McLaren: "#fb923c",
  "Red Bull": "#3b82f6",
  "Aston Martin": "#22c55e",
  "Alpine F1 Team": "#ec4899",
  Williams: "#38bdf8",
  "Haas F1 Team": "#9ca3af",
  "RB F1 Team": "#818cf8",
  Audi: "#d1d5db",
  "Cadillac F1 Team": "#facc15",
}

export const SESSION_COLORS: Record<string, { bg: string; text: string }> = {
  "Practice 1": { bg: "#1e3a5f", text: "#93c5fd" },
  "Practice 2": { bg: "#1e3a5f", text: "#93c5fd" },
  "Practice 3": { bg: "#1e3a5f", text: "#93c5fd" },
  "Sprint Qualifying": { bg: "#3b0764", text: "#d8b4fe" },
  Sprint: { bg: "#3b0764", text: "#d8b4fe" },
  Qualifying: { bg: "#713f12", text: "#fde68a" },
  Race: { bg: "#7f1d1d", text: "#fca5a5" },
}

export const PODIUM_COLORS = {
  p1: "#facc15",
  p2: "#d4d4d8",
  p3: "#92400e",
  other: "#52525b",
} as const

export function getPodiumColor(index: number): string {
  if (index === 0) return PODIUM_COLORS.p1
  if (index === 1) return PODIUM_COLORS.p2
  if (index === 2) return PODIUM_COLORS.p3
  return PODIUM_COLORS.other
}

export const STATUS_COLORS = {
  success: { bg: "#052e16", border: "#166534", text: "#4ade80" },
  warning: { bg: "#1c1a00", border: "#713f12", text: "#facc15" },
  processing: { bg: "rgba(245, 158, 11, 0.05)", border: "rgba(245, 158, 11, 0.3)", text: "#fbbf24" },
  error: { bg: "#1c0000", border: "#7f1d1d", text: "#f87171" },
  info: { bg: "#0d1f3c", border: "#1e3a5f", text: "#60a5fa" },
} as const

export function getTeamColor(team: string): string {
  return TEAM_COLORS[team] ?? "#52525b"
}
