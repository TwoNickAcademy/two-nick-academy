import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { api } from '../api/client'

export interface AuthUser {
  id:              string
  email:           string
  displayName:     string
  avatarUrl:       string | null
  referralCode:    string
  membershipLevel: 'GENERAL' | 'VIP' | 'SUPREMO' | 'MASTER'
  role:            'USER' | 'TEACHER' | 'ADMIN' | 'CREATOR'
}

interface AuthState {
  user:         AuthUser | null
  isLoading:    boolean
  isHydrated:   boolean

  login:    (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout:   () => Promise<void>
  hydrate:  () => Promise<void>
  setUser:  (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user:       null,
  isLoading:  false,
  isHydrated: false,

  // ─── Cargar sesión guardada al arrancar la app ────────────────
  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken')
      if (!token) return set({ isHydrated: true })

      const { data } = await api.get('/users/me')
      const p = data.data
      set({
        user: {
          id:              p.id,
          email:           p.email,
          displayName:     p.displayName,
          avatarUrl:       p.avatarUrl ?? null,
          referralCode:    p.referralCode,
          membershipLevel: p.membership?.level ?? 'GENERAL',
          role:            p.role ?? 'USER',
        },
        isHydrated: true,
      })
    } catch {
      await SecureStore.deleteItemAsync('accessToken')
      await SecureStore.deleteItemAsync('refreshToken')
      set({ isHydrated: true })
    }
  },

  // ─── Login ───────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const { user, accessToken, refreshToken } = data.data

      await SecureStore.setItemAsync('accessToken', accessToken)
      await SecureStore.setItemAsync('refreshToken', refreshToken)
      set({ user, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false })
      throw new Error(err?.response?.data?.message ?? 'Error al iniciar sesión')
    }
  },

  // ─── Registro ────────────────────────────────────────────────
  register: async (email, password, displayName) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/auth/register', { email, password, displayName })
      const { user, accessToken, refreshToken } = data.data

      await SecureStore.setItemAsync('accessToken', accessToken)
      await SecureStore.setItemAsync('refreshToken', refreshToken)
      set({ user, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false })
      throw new Error(err?.response?.data?.message ?? 'Error al registrarse')
    }
  },

  // ─── Logout ──────────────────────────────────────────────────
  logout: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken')
      if (refreshToken) await api.post('/auth/logout', { refreshToken })
    } catch {}
    await SecureStore.deleteItemAsync('accessToken')
    await SecureStore.deleteItemAsync('refreshToken')
    set({ user: null })
  },

  setUser: (user) => set({ user }),
}))
