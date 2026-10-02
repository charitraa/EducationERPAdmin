import { createContext } from 'react'
import type { PermissionSet } from '@/lib/permissions'
import type { CurrentUser, LoginRequest } from '@/shared/types/auth'

/** `unreachable`: a session exists but couldn't be resumed right now (rate limit, server down, offline). */
export type AuthStatus = 'booting' | 'authenticated' | 'anonymous' | 'unreachable'

export interface AuthContextValue {
  status: AuthStatus
  /** Set once `/auth/me/` has loaded. */
  user: CurrentUser | null
  permissions: PermissionSet
  /** True when the last session ended because refresh failed (not a manual logout). */
  sessionExpired: boolean
  login: (body: LoginRequest) => Promise<CurrentUser>
  logout: () => Promise<void>
  /** Try resuming the session again after `unreachable`. */
  retry: () => void
  /** Why resuming failed, for the `unreachable` screen. */
  bootError: unknown
}

export const AuthContext = createContext<AuthContextValue | null>(null)
