import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = makeRedirectUri({
    scheme: "pitwall",
    path: "(tabs)",
  });

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

const handleGoogleAuth = async () => {
  setGoogleLoading(true)
  setError(null)
  try {
    const redirectUri = makeRedirectUri({ 
      scheme: "pitwall",
      path: "auth/callback"
    })

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    })

    if (error) throw error
    if (!data.url) throw new Error("No auth URL returned")

    const result = await WebBrowser.openAuthSessionAsync(
      data.url, 
      redirectUri  // this tells the browser what URL to watch for
    )

    if (result.type === "success" && result.url) {
      const url = new URL(result.url)
      
      // Check hash fragment first (Supabase uses this)
      const hashParams = new URLSearchParams(url.hash.replace("#", ""))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        router.replace("/(tabs)")
        return
      }

      // Fallback to query params
      const queryAccess = url.searchParams.get("access_token")
      const queryRefresh = url.searchParams.get("refresh_token")
      if (queryAccess && queryRefresh) {
        await supabase.auth.setSession({
          access_token: queryAccess,
          refresh_token: queryRefresh,
        })
        router.replace("/(tabs)")
      }
    }
  } catch (err: any) {
    setError(err.message || "Google sign in failed")
  } finally {
    setGoogleLoading(false)
  }
}

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          {/* Header */}
          <View className="mb-12">
            <Text className="text-white text-5xl font-black leading-none">
              PITWALL
            </Text>
            <Text className="text-red-500 text-5xl font-black leading-none">
              AI
            </Text>
            <Text className="text-zinc-500 text-sm mt-3">
              {isSignUp ? "Create your account" : "Sign in to compete"}
            </Text>
          </View>

          {/* Google Button */}
          <TouchableOpacity
            onPress={handleGoogleAuth}
            disabled={googleLoading}
            className="border border-zinc-700 rounded-xl py-4 items-center flex-row justify-center gap-3 mb-4 bg-zinc-950"
          >
            {googleLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text className="text-xl">G</Text>
                <Text className="text-white font-bold text-base">
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="flex-1 h-px bg-zinc-800" />
            <Text className="text-zinc-600 text-xs font-semibold tracking-widest uppercase">
              or
            </Text>
            <View className="flex-1 h-px bg-zinc-800" />
          </View>

          {/* Email + Password */}
          <View className="gap-3 mb-6">
            <View className="border border-zinc-800 rounded-xl px-4 py-3 bg-zinc-950">
              <Text className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-1">
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#52525b"
                keyboardType="email-address"
                autoCapitalize="none"
                className="text-white text-base"
              />
            </View>

            <View className="border border-zinc-800 rounded-xl px-4 py-3 bg-zinc-950">
              <Text className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-1">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#52525b"
                secureTextEntry
                className="text-white text-base"
              />
            </View>
          </View>

          {/* Error */}
          {error && (
            <View className="border border-red-900 bg-red-950 rounded-xl p-4 mb-4">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleEmailAuth}
            disabled={loading}
            className="bg-red-500 rounded-xl py-4 items-center mb-4"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-black text-base">
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle */}
          <TouchableOpacity
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="items-center"
          >
            <Text className="text-zinc-500 text-sm">
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
              <Text className="text-red-500 font-bold">
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
