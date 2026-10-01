const KEY = 'tb24.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    // storage unavailable (private mode) — session lives in memory only
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
