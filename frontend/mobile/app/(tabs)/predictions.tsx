import { View, Text } from "react-native"
export default function PicksScreen() {
  return (
    <View className="flex-1 bg-black items-center justify-center">
      <Text className="text-white font-black text-2xl">My Picks</Text>
      <Text className="text-zinc-500 text-sm mt-2">Coming soon</Text>
    </View>
  )
}