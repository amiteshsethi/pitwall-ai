import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { supabase } from "../lib/supabase"
import Button from "./ui/Button"

const links = [
  { path: "/", label: "Home" },
  { path: "/race", label: "Race Weekend" },
  { path: "/standings", label: "Standings" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/picks", label: "Predictions" },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/")
    setMenuOpen(false)
  }

  const linkClass = (path: string) =>
    pathname === path ? "text-red-500" : "text-[#71717a] hover:text-white"

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ backgroundColor: "#090909", borderColor: "#27272a" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <span className="text-red-500 font-black text-lg sm:text-xl tracking-widest">PITWALL</span>
          <span className="text-white font-light text-lg sm:text-xl tracking-widest">AI</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${linkClass(link.path)}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!loading && (
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-zinc-500 text-xs">{user.email?.split("@")[0]}</span>
                  <button
                    onClick={handleSignOut}
                    className="border border-zinc-700 hover:border-red-500 text-zinc-400 hover:text-red-500 text-xs font-medium px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Button to="/login" className="text-xs px-4 py-2">
                  Sign In
                </Button>
              )}
            </div>
          )}

          <button
            type="button"
            className="md:hidden text-zinc-400 hover:text-white p-2 cursor-pointer"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="md:hidden border-t px-4 py-4 space-y-3"
          style={{ backgroundColor: "#090909", borderColor: "#27272a" }}
        >
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              className={`block text-[11px] font-bold uppercase tracking-[0.15em] py-2 ${linkClass(link.path)}`}
            >
              {link.label}
            </Link>
          ))}
          {!loading && (
            <div className="pt-3 border-t border-[#27272a]">
              {user ? (
                <div className="space-y-3">
                  <p className="text-zinc-500 text-xs">{user.email?.split("@")[0]}</p>
                  <button
                    onClick={handleSignOut}
                    className="w-full border border-zinc-700 text-zinc-400 text-xs font-medium px-3 py-2 rounded-xl cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Button to="/login" className="w-full text-sm" onClick={() => setMenuOpen(false)}>
                  Sign In
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
