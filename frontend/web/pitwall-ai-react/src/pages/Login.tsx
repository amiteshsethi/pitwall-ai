import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import Button from "../components/ui/Button"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleEmailAuth = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        setError(signUpError.message)
      } else {
        setMessage("Check your email for a confirmation link!")
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
      } else {
        navigate("/")
      }
    }
    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: import.meta.env.VITE_SITE_URL || window.location.origin,
      },
    })
    if (oauthError) setError(oauthError.message)
  }

  return (
    <div className="min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-red-500 font-black text-2xl tracking-widest">PITWALL</span>
            <span className="text-white font-light text-2xl tracking-widest">AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-zinc-500 text-sm">
            {isSignUp
              ? "Join PitWall AI and start predicting races"
              : "Sign in to submit your picks and track your accuracy"}
          </p>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8 space-y-4"
          style={{ backgroundColor: "#090909", border: "1px solid #18181b" }}
        >
          <button
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 border border-zinc-700 hover:border-red-500 bg-zinc-950 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#27272a]" />
            <span className="text-zinc-600 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-[#27272a]" />
          </div>

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-red-500 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-red-500 transition-colors"
          />

          {error && (
            <div
              className="rounded-xl p-3 text-sm"
              style={{
                backgroundColor: "#1c0000",
                border: "1px solid #7f1d1d",
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}
          {message && (
            <div
              className="rounded-xl p-3 text-sm"
              style={{
                backgroundColor: "#052e16",
                border: "1px solid #166534",
                color: "#4ade80",
              }}
            >
              {message}
            </div>
          )}

          <Button
            onClick={handleEmailAuth}
            disabled={loading || !email || !password}
            className="w-full"
          >
            {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>

          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
              setMessage(null)
            }}
            className="w-full text-zinc-500 hover:text-white text-sm transition-colors cursor-pointer"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
