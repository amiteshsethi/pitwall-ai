interface SessionBadgeProps {
  session: string
}

const sessionColors: Record<string, string> = {
  'Practice 1': 'bg-blue-900 text-blue-300',
  'Practice 2': 'bg-blue-900 text-blue-300',
  'Practice 3': 'bg-blue-900 text-blue-300',
  'Sprint Qualifying': 'bg-purple-900 text-purple-300',
  'Sprint': 'bg-purple-900 text-purple-300',
  'Qualifying': 'bg-yellow-900 text-yellow-300',
  'Race': 'bg-red-900 text-red-300',
}

export default function SessionBadge({ session }: SessionBadgeProps) {
  const color = sessionColors[session] ?? 'bg-zinc-800 text-zinc-300'
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
      {session}
    </span>
  )
}