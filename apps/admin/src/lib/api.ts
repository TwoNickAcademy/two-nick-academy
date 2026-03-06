import axios, { AxiosError } from 'axios'
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
} from './auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request: adjuntar Bearer token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: renovar token en 401 ───────────────────────────────
let refreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as typeof err.config & { _retry?: boolean }

    if (err.response?.status !== 401 || original?._retry) {
      return Promise.reject(err)
    }

    original._retry = true

    // Si ya hay un refresh en curso, encolar y esperar
    if (refreshing) {
      return new Promise((resolve) => {
        queue.push((newToken: string) => {
          original!.headers!['Authorization'] = `Bearer ${newToken}`
          resolve(api(original!))
        })
      })
    }

    refreshing = true
    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) throw new Error('no refresh token')

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
      const newAccess  = data.data.accessToken as string
      const newRefresh = data.data.refreshToken as string

      setAccessToken(newAccess)
      setRefreshToken(newRefresh)

      // Desencolar peticiones pendientes
      queue.forEach((cb) => cb(newAccess))
      queue = []

      original!.headers!['Authorization'] = `Bearer ${newAccess}`
      return api(original!)
    } catch {
      clearTokens()
      queue = []
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      refreshing = false
    }
  },
)

// ── Helpers tipados ───────────────────────────────────────────────

export async function apiGet<T>(url: string): Promise<T> {
  const res = await api.get<{ data: T }>(url)
  return res.data.data
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<{ data: T }>(url, body)
  return res.data.data
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch<{ data: T }>(url, body)
  return res.data.data
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await api.delete<{ data: T }>(url)
  return res.data.data
}
