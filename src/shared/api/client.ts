import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { tokens } from '@/lib/auth'
import { env } from '@/lib/env'
import type { TokenPair } from '@/shared/types/auth'
import { toApiError } from './errors'

export const apiClient = axios.create({ baseURL: env.apiBaseUrl })

// The refresh call goes through a bare instance so it never re-enters the 401 handler.
const bare = axios.create({ baseURL: env.apiBaseUrl })

let onSessionExpired: (() => void) | null = null
/** Called once refresh has failed: the app clears state and sends the user to /login. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

let refreshing: Promise<string> | null = null

/**
 * Only a definite "no" from the server (400/401: expired, rotated or revoked)
 * ends the session. Rate limits, server errors and network drops are
 * temporary: keep the refresh token and let the user try again.
 */
export function isSessionRejected(err: unknown): boolean {
  if (err instanceof Error && err.message === 'No session') return true
  const status = toApiError(err).status
  return status === 400 || status === 401
}

/**
 * Trade the refresh token for a new pair. The backend rotates refresh tokens,
 * so concurrent 401s must share one call: a second call with the old token would fail.
 * A remembered session is shared by every tab, so another tab may rotate it
 * first; then the stored token has changed and one more try with it succeeds.
 */
export function refreshSession(): Promise<string> {
  const trade = async (attempt: number): Promise<string> => {
    const refresh = tokens.getRefresh()
    if (!refresh) throw new Error('No session')
    try {
      const { data } = await bare.post<TokenPair>('/auth/refresh/', { refresh })
      tokens.set(data)
      return data.access
    } catch (err) {
      const newer = tokens.getRefresh()
      if (attempt === 0 && isSessionRejected(err) && newer && newer !== refresh) return trade(1)
      throw err
    }
  }
  refreshing ??= trade(0).finally(() => {
    refreshing = null
  })
  return refreshing
}

apiClient.interceptors.request.use((config) => {
  const access = tokens.getAccess()
  if (access) config.headers.set('Authorization', `Bearer ${access}`)
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

const AUTH_PATHS = ['/auth/login/', '/auth/refresh/', '/auth/logout/']

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined
  const isAuthCall = AUTH_PATHS.some((p) => config?.url?.endsWith(p))

  if (error.response?.status === 401 && config && !config._retried && !isAuthCall) {
    config._retried = true
    try {
      const access = await refreshSession()
      config.headers.set('Authorization', `Bearer ${access}`)
      return apiClient(config)
    } catch (refreshError) {
      if (!isSessionRejected(refreshError)) return Promise.reject(toApiError(refreshError))
      tokens.clear()
      onSessionExpired?.()
    }
  }
  return Promise.reject(toApiError(error))
})
