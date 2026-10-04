import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type AuthStatus } from '@/context/AuthContext'
import { tokens } from '@/lib/auth'
import { createPermissionSet } from '@/lib/permissions'
import { authApi, authKeys } from '@/features/authentication/api/auth.api'
import { isSessionRejected, refreshSession, setSessionExpiredHandler } from '@/shared/api/client'
import type { LoginRequest, LoginResponse } from '@/shared/types/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // A refresh token from earlier in this tab means we can try to resume silently.
  const [status, setStatus] = useState<AuthStatus>(() => (tokens.getRefresh() ? 'booting' : 'anonymous'))
  const [sessionExpired, setSessionExpired] = useState(false)
  const [bootError, setBootError] = useState<unknown>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (status !== 'booting') return
    refreshSession()
      .then(() => setStatus('authenticated'))
      .catch((err) => {
        if (isSessionRejected(err)) {
          tokens.clear()
          setStatus('anonymous')
        } else {
          setBootError(err)
          setStatus('unreachable')
        }
      })
    // Runs on mount, and again when the user retries.
  }, [attempt])

  const retry = useCallback(() => {
    setBootError(null)
    setStatus('booting')
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear()
      setSessionExpired(true)
      setStatus('anonymous')
    })
  }, [queryClient])

  const me = useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  })

  const signIn = useCallback(
    (res: LoginResponse) => {
      tokens.set(res)
      queryClient.setQueryData(authKeys.me, res.user)
      setSessionExpired(false)
      setStatus('authenticated')
      return res.user
    },
    [queryClient],
  )

  const login = useCallback(async (body: LoginRequest) => signIn(await authApi.login(body)), [signIn])

  const logout = useCallback(async () => {
    const refresh = tokens.getRefresh()
    try {
      if (refresh) await authApi.logout(refresh)
    } catch {
      // Logging out locally matters more than the server acknowledging it.
    }
    tokens.clear()
    queryClient.clear()
    setSessionExpired(false)
    setStatus('anonymous')
  }, [queryClient])

  const user = status === 'authenticated' ? (me.data ?? null) : null
  const value = useMemo<AuthContextValue>(
    () => ({
      // Still "booting" until we know who the user is.
      status: status === 'authenticated' && !user && !me.isError ? 'booting' : status,
      user,
      permissions: createPermissionSet(user),
      sessionExpired,
      login,
      signIn,
      logout,
      retry,
      bootError,
    }),
    [status, user, me.isError, sessionExpired, login, signIn, logout, retry, bootError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
