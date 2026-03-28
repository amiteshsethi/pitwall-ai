import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import F1Loader from './F1loader'
import { useState } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const [loaderType] = useState(() => Math.floor(Math.random() * 4) + 1)

  if (loading) return <F1Loader type={loaderType} />
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}