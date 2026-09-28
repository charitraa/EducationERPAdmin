import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api/auth'
import { clearTokens, getRefreshToken, registerAuthExpiredHandler, setTokens } from '@/lib/api/client'
import { toApiError } from '@/lib/api/errors'
import { useAuthStore } from '@/stores/auth-store'

/** Bootstraps the auth store from a persisted refresh token on app load, and
 * wires the axios client's "session expired" callback to a real logout. */
export function useAuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser)
  const setStatus = useAuthStore((s) => s.setStatus)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    registerAuthExpiredHandler(() => {
      clearTokens()
      logout()
    })
  }, [logout])

  useEffect(() => {
    const refresh = getRefreshToken()
    if (!refresh) {
      setStatus('unauthenticated')
      return
    }
    setStatus('loading')
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        clearTokens()
        setStatus('unauthenticated')
      })
    // authApi.me() relies on the request interceptor, which has no access
    // token yet on a cold load — so this only works because /auth/me/ 401s
    // once and the response interceptor transparently refreshes + retries.
  }, [setUser, setStatus])
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()

  return useCallback(
    async (payload: { email: string; password: string; otp?: string }) => {
      try {
        const res = await authApi.login(payload)
        setTokens({ access: res.access, refresh: res.refresh })
        setUser(res.user)
        navigate('/', { replace: true })
        return { ok: true as const }
      } catch (err) {
        const apiError = toApiError(err)
        return { ok: false as const, error: apiError }
      }
    },
    [setUser, navigate],
  )
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return useCallback(async () => {
    const refresh = getRefreshToken()
    try {
      if (refresh) await authApi.logout(refresh)
    } catch {
      // best-effort — clear local state regardless
    }
    clearTokens()
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])
}
