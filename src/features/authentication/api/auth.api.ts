import { apiClient } from '@/shared/api/client'
import type { CurrentUser, LoginRequest, LoginResponse } from '@/shared/types/auth'

export const authKeys = {
  me: ['auth', 'me'] as const,
  twoFactor: ['auth', '2fa'] as const,
}

/** `PATCH /auth/me/`: contact details only; email and roles are changed by an administrator. */
export interface MyDetailsInput {
  first_name: string
  middle_name: string
  last_name: string
  phone: string
}

/** `GET /auth/2fa/`. `pending_setup`: an app was added but its first code never confirmed. */
export interface TwoFactorStatus {
  enabled: boolean
  pending_setup: boolean
  recovery_codes_left: number
}

export const authApi = {
  login: (body: LoginRequest) => apiClient.post<LoginResponse>('/auth/login/', body).then((r) => r.data),
  logout: (refresh: string) => apiClient.post('/auth/logout/', { refresh }).then(() => undefined),
  me: () => apiClient.get<CurrentUser>('/auth/me/').then((r) => r.data),
  updateMe: (body: MyDetailsInput) => apiClient.patch<CurrentUser>('/auth/me/', body).then((r) => r.data),
  changePassword: (body: { current_password: string; new_password: string }) =>
    apiClient.post('/auth/change-password/', body).then(() => undefined),
}

export const twoFactorApi = {
  status: () => apiClient.get<TwoFactorStatus>('/auth/2fa/').then((r) => r.data),
  /** Needs the password again. Returns the secret for typing in, and the URI to show as a QR code. */
  setup: (password: string) =>
    apiClient.post<{ secret: string; otpauth_uri: string }>('/auth/2fa/setup/', { password }).then((r) => r.data),
  /** The first app code turns it on. The recovery codes are shown only now. */
  confirm: (code: string) => apiClient.post<{ recovery_codes: string[] }>('/auth/2fa/confirm/', { code }).then((r) => r.data),
  /** Replaces every recovery code; needs a current app code. */
  newRecoveryCodes: (code: string) =>
    apiClient.post<{ recovery_codes: string[] }>('/auth/2fa/recovery-codes/', { code }).then((r) => r.data),
  /** `code` may be an app code or a recovery code. */
  disable: (body: { password: string; code: string }) => apiClient.post('/auth/2fa/disable/', body).then(() => undefined),
}
