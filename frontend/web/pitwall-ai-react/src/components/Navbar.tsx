import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const links = [
  { path: '/', label: 'Home' },
  { path: '/race', label: 'Race Weekend' },
  { path: '/standings', label: 'Standings' },
  { path: '/picks', label: 'Predictions' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav className="border-b border-zinc-800 bg-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        <Link to="/" className="flex items-center gap-2">
          <span className="text-red-500 font-black text-xl tracking-widest">PITWALL</span>
          <span className="text-white font-light text-xl tracking-widest">AI</span>
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

        {/* Auth */}
        {!loading && (
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-zinc-500 text-xs">
                  {user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  className="border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-red-500 text-xs font-medium px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        )}

      </div>
    </nav>
  )
}