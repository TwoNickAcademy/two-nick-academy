// ── Token management (in-memory access token + localStorage refresh) ──

let _accessToken: string | null = null

export function setAccessToken(token: string) {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

export function setRefreshToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tn_refresh', token)
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('tn_refresh')
}

export function clearTokens() {
  _accessToken = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('tn_refresh')
  }
}

export function isAuthenticated(): boolean {
  return _accessToken !== null || getRefreshToken() !== null
}
