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
      // Cold-start / warm-start deep link: pitwall://auth/callback?code=xxx
      if (url && url.includes('code=')) {
        const { error } = await supabase.auth.exchangeCodeForSession(url)
        router.replace(error ? '/login' : '/(tabs)')
        return
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