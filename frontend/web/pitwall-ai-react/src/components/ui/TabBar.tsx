interface TabBarProps<T extends string> {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (tab: T) => void
  className?: string
}

export default function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: TabBarProps<T>) {
  return (
    <div
      className={`flex gap-2 mb-6 border-b border-[#27272a] ${className}`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className="px-4 sm:px-5 py-3 -mb-px cursor-pointer transition-colors"
          style={{
            borderBottom: `2px solid ${active === tab.id ? "#ef4444" : "transparent"}`,
            color: active === tab.id ? "#ef4444" : "#71717a",
            fontWeight: 700,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
