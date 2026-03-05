import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useAuthStore } from '../src/store/auth.store'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { user, isHydrated, hydrate } = useAuthStore()
  const router   = useRouter()
  const segments = useSegments()

  useEffect(() => {
    hydrate().finally(() => SplashScreen.hideAsync())
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const inAuth = segments[0] === '(auth)'
    if (!user && !inAuth) {
      router.replace('/(auth)/login')
    } else if (user && inAuth) {
      router.replace('/(tabs)')
    }
  }, [user, isHydrated, segments])

  return (
    <>
      <StatusBar style="light" backgroundColor="#080B12" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </>
  )
}
