import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleEmailAuth = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a confirmation link!')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        navigate('/')
      }
    }
    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-red-500 font-black text-2xl tracking-widest">PITWALL</span>
            <span className="text-white font-light text-2xl tracking-widest">AI</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-zinc-500 text-sm">
            {isSignUp
              ? 'Join PitWall AI and start predicting races'
              : 'Sign in to submit your picks and track your accuracy'}
          </p>
        </div>

        {/* Card */}
        <div className="border border-zinc-800 rounded-2xl p-8 bg-zinc-950 space-y-4">

          {/* Google */}
          <button
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 border border-zinc-700 hover:border-red-500 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Email */}
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500 text-white text-sm px-4 py-3 rounded-xl outline-none transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-red-500 text-white text-sm px-4 py-3 rounded-xl outline-none transition-colors"
            />
          </div>

          {/* Error / Message */}
          {error && (
            <div className="border border-red-900 bg-red-950 rounded-xl p-3 text-red-400 text-xs">
              {error}
            </div>
          )}
          {message && (
            <div className="border border-green-900 bg-green-950 rounded-xl p-3 text-green-400 text-xs">
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleEmailAuth}
            disabled={loading || !email || !password}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          {/* Toggle */}
          <p className="text-center text-zinc-500 text-xs">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null) }}
              className="text-red-500 hover:text-red-400 font-semibold cursor-pointer"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}