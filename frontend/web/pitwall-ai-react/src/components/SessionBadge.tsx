import { SESSION_COLORS } from "../lib/theme"

interface SessionBadgeProps {
  session: string
}

export default function SessionBadge({ session }: SessionBadgeProps) {
  const colors = SESSION_COLORS[session] ?? { bg: "#18181b", text: "#a1a1aa" }

  return (
    <span
      className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {session}
    </span>
  )
}
