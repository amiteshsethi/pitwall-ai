import { Link, useLocation } from 'react-router-dom'

const links = [
  { path: '/', label: 'Home' },
  { path: '/race', label: 'Race Weekend' },
  { path: '/standings', label: 'Standings' },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="border-b border-zinc-800 bg-black sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        
        <Link to="/" className="flex items-center gap-2">
          <span className="text-red-500 font-black text-xl tracking-widest">
            PITWALL
          </span>
          <span className="text-white font-light text-xl tracking-widest">
            AI
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {links.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors ${
                pathname === link.path
                  ? 'text-red-500'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

      </div>
    </nav>
  )
}