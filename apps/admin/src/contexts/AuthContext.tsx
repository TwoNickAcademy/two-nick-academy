'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import axios from 'axios'
import {
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearTokens,
} from '@/lib/auth'

// ── Tipos ─────────────────────────────────────────────────────────

interface AdminUser {
  id:          string
  email:       string
  displayName: string
  avatarUrl:   string | null
}

interface AuthState {
  user:    AdminUser | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login:  (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  // Intentar restaurar sesión con refreshToken al montar
  useEffect(() => {
    const restore = async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        setState({ user: null, loading: false })
        return
      }
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        setAccessToken(data.data.accessToken)
        setRefreshToken(data.data.refreshToken)

        const { data: meData } = await axios.get(`${BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${data.data.accessToken}` },
        })
        setState({ user: meData.data, loading: false })
      } catch {
        clearTokens()
        setState({ user: null, loading: false })
      }
    }
    restore()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await axios.post(`${BASE_URL}/auth/login`, { email, password })
    const { accessToken, refreshToken, user } = data.data

    setAccessToken(accessToken)
    setRefreshToken(refreshToken)
    setState({ user, loading: false })
  }, [])

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        await axios.post(
          `${BASE_URL}/auth/logout`,
          { refreshToken },
          { headers: { Authorization: `Bearer ${refreshToken}` } },
        )
      }
    } finally {
      clearTokens()
      setState({ user: null, loading: false })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
