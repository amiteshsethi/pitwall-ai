import type { ReactNode } from "react"

interface SectionProps {
  children: ReactNode
  divider?: boolean
  className?: string
  padding?: boolean
}

export default function Section({
  children,
  divider = true,
  className = "",
  padding = true,
}: SectionProps) {
  return (
    <section
      className={`${divider ? "section-divider" : ""} ${padding ? "p-2 sm:p-[7px]" : ""} mb-8 sm:mb-10 ${className}`}
    >
      {children}
    </section>
  )
}
