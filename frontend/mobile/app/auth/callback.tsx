import { useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { useURL } from "expo-linking"
import { supabase } from "../../lib/supabase"

export default function AuthCallback() {
  const router = useRouter()
  const url = useURL()

  useEffect(() => {
    const handleCallback = async () => {
      // Cold-start / warm-start deep link: pitwall://auth/callback#access_token=XXX&...
      if (url && url.includes('access_token=')) {
        const hash = url.split('#')[1] ?? ''
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          router.replace(error ? '/login' : '/(tabs)')
          return
        }
      }

      // Main flow: session already set by login.tsx after openAuthSessionAsync
      const { data: { session } } = await supabase.auth.getSession()
      router.replace(session ? '/(tabs)' : '/login')
    }

    handleCallback()
  }, [url])

  return (
    <View className="flex-1 bg-black items-center justify-center">
      <ActivityIndicator color="#ef4444" size="large" />
    </View>
  )
}