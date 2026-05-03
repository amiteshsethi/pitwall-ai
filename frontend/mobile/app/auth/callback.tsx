import { useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "../../lib/supabase"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/(tabs)")
      } else {
        router.replace("/login")
      }
    })
  }, [])

  return (
    <View className="flex-1 bg-black items-center justify-center">
      <ActivityIndicator color="#ef4444" size="large" />
    </View>
  )
}