import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { useAuthStore } from '../src/store/auth.store'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { user, isHydrated, hydrate } = useAuthStore()
  const router   = useRouter()
  const segments = useSegments()

  useEffect(() => {
    initApp()
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

  async function initApp() {
    try {
      const token      = await SecureStore.getItemAsync('accessToken')
      const bioEnabled = await SecureStore.getItemAsync('biometricEnabled')

      if (token && bioEnabled === 'true') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync()
        const isEnrolled  = await LocalAuthentication.isEnrolledAsync()

        if (hasHardware && isEnrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage:         'Accede a Two-Nick Academy',
            fallbackLabel:         'Usar contraseña',
            cancelLabel:           'Cancelar',
            disableDeviceFallback: false,
          })

          if (result.success) {
            await hydrate()
          } else {
            // Falló o canceló — mostrar login sin borrar tokens
            // El usuario puede reintentar con huella desde el login
            useAuthStore.setState({ isHydrated: true })
          }
          return
        } else {
          // Hardware no disponible — deshabilitar biometría
          await SecureStore.deleteItemAsync('biometricEnabled')
        }
      }

      await hydrate()
    } finally {
      SplashScreen.hideAsync()
    }
  }

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
