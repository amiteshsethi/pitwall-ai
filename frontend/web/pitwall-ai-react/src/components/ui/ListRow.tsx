import type { ReactNode } from "react"
import { getTeamColor } from "../../lib/theme"

interface ListRowProps {
  position?: ReactNode
  team?: string
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  meta?: ReactNode
  highlight?: boolean
  className?: string
  children?: ReactNode
}

export default function ListRow({
  position,
  team,
  title,
  subtitle,
  trailing,
  meta,
  highlight = false,
  className = "",
  children,
}: ListRowProps) {
  const teamColor = team ? getTeamColor(team) : undefined

  return (
    <div
      className={`flex items-center gap-3 sm:gap-4 rounded-xl sm:rounded-[14px] p-3 sm:p-3.5 ${className}`}
      style={{
        backgroundColor: "#0d0d0d",
        border: `1px solid ${highlight ? "#713f12" : "#18181b"}`,
      }}
    >
      {position !== undefined && (
        <span className="text-sm sm:text-lg font-black w-6 text-center flex-shrink-0">
          {position}
        </span>
      )}

      {teamColor && (
        <div
          className="flex-shrink-0 rounded-sm"
          style={{ width: 2, height: 28, backgroundColor: teamColor }}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="text-white font-black text-sm tracking-wider">{title}</div>
        {subtitle && (
          <div className="text-zinc-500 text-xs truncate mt-0.5">{subtitle}</div>
        )}
        {children}
      </div>

      {trailing && <div className="flex-shrink-0">{trailing}</div>}

      {meta && (
        <div className="text-zinc-500 text-xs text-right flex-shrink-0 hidden sm:block">
          {meta}
        </div>
      )}
    </div>
  )
}
