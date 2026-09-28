import axios, { type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
const REFRESH_STORAGE_KEY = 'eerp.refresh'

/**
 * Access token lives only in memory (cleared on full page reload); the
 * refresh token is the one persisted, so a reload silently re-derives a
 * fresh access token via /auth/refresh/ instead of keeping a long-lived
 * bearer token sitting in storage.
 */
let accessToken: string | null = null
let refreshToken: string | null = localStorage.getItem(REFRESH_STORAGE_KEY)
let onAuthExpired: (() => void) | null = null

export function setTokens(tokens: { access: string; refresh: string }) {
  accessToken = tokens.access
  refreshToken = tokens.refresh
  localStorage.setItem(REFRESH_STORAGE_KEY, tokens.refresh)
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  localStorage.removeItem(REFRESH_STORAGE_KEY)
}

export function getRefreshToken() {
  return refreshToken
}

export function registerAuthExpiredHandler(handler: () => void) {
  onAuthExpired = handler
}

export const api = axios.create({ baseURL: BASE_URL })

// Bare instance for the refresh call itself — must not carry the
// Authorization/401-retry interceptors below, or a stale access token would
// short-circuit into another 401 loop.
const refreshClient = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

let refreshPromise: Promise<string> | null = null

async function performRefresh(): Promise<string> {
  if (!refreshToken) throw new Error('No refresh token')
  const { data } = await refreshClient.post<{ access: string; refresh: string }>('/auth/refresh/', {
    refresh: refreshToken,
  })
  accessToken = data.access
  refreshToken = data.refresh
  localStorage.setItem(REFRESH_STORAGE_KEY, data.refresh)
  return data.access
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isAuthEndpoint) {
      if (!refreshToken) {
        onAuthExpired?.()
        return Promise.reject(error)
      }
      originalRequest._retried = true
      try {
        refreshPromise ??= performRefresh().finally(() => {
          refreshPromise = null
        })
        const newAccess = await refreshPromise
        originalRequest.headers.set('Authorization', `Bearer ${newAccess}`)
        return api(originalRequest)
      } catch {
        clearTokens()
        onAuthExpired?.()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)
