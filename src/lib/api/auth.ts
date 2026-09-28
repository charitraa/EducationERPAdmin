import { api } from './client'
import type { CurrentUser, LoginResponse } from './types'

export interface LoginPayload {
  email: string
  password: string
  otp?: string
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<LoginResponse>('/auth/login/', payload).then((r) => r.data),

  logout: (refresh: string) => api.post('/auth/logout/', { refresh }),

  me: () => api.get<CurrentUser>('/auth/me/').then((r) => r.data),

  updateMe: (payload: Partial<Pick<CurrentUser, 'first_name' | 'middle_name' | 'last_name'>> & { phone?: string }) =>
    api.patch<CurrentUser>('/auth/me/', payload).then((r) => r.data),

  changePassword: (payload: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password/', payload),

  twoFactorStatus: () =>
    api
      .get<{ enabled: boolean; pending_setup: boolean; recovery_codes_left: number }>('/auth/2fa/')
      .then((r) => r.data),

  twoFactorSetup: (password: string) =>
    api.post<{ secret: string; otpauth_uri: string }>('/auth/2fa/setup/', { password }).then((r) => r.data),

  twoFactorConfirm: (code: string) =>
    api.post<{ recovery_codes: string[] }>('/auth/2fa/confirm/', { code }).then((r) => r.data),

  twoFactorRecoveryCodes: (code: string) =>
    api.post<{ recovery_codes: string[] }>('/auth/2fa/recovery-codes/', { code }).then((r) => r.data),

  twoFactorDisable: (payload: { password: string; code: string }) => api.post('/auth/2fa/disable/', payload),
}
