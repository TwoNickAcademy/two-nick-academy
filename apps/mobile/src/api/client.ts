import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { API_BASE_URL } from '../constants/api'

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync('accessToken')
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Inyectar accessToken en cada request ────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Refresh automático si el token expira (401) ─────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
        const newToken = data.data.accessToken

        await SecureStore.setItemAsync('accessToken', newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        // Refresh falló — limpiar sesión
        await SecureStore.deleteItemAsync('accessToken')
        await SecureStore.deleteItemAsync('refreshToken')
        // El store de auth detectará el estado vacío en el próximo render
      }
    }
    return Promise.reject(error)
  },
)
