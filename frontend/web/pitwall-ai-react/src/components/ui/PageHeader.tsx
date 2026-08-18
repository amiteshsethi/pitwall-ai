interface PageHeaderProps {
  eyebrow: string
  title: string
  accent?: string
  subtitle?: string
  className?: string
}

export default function PageHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`mb-6 sm:mb-8 ${className}`}>
      <p className="label-eyebrow mb-3">{eyebrow}</p>
      <h1 className="headline-display">{title}</h1>
      {accent && <h1 className="headline-accent">{accent}</h1>}
      {subtitle && <p className="text-zinc-400 mt-2 text-sm sm:text-base">{subtitle}</p>}
    </div>
  )
}
