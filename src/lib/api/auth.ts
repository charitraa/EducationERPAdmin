import { api } from './client'
import { env } from '@/config/env'
import { mockAware } from '@/mocks/mock-crud'
import { mockCurrentUser, mockTwoFactorStatus } from '@/mocks/data/auth'
import type { CurrentUser, LoginResponse } from './types'

export interface LoginPayload {
  email: string
  password: string
  otp?: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    mockAware<LoginResponse>(
      env.useMocks,
      () => Promise.resolve({ access: 'mock-access-token', refresh: 'mock-refresh-token', user: mockCurrentUser }),
      () => api.post<LoginResponse>('/auth/login/', payload).then((r) => r.data),
    ),

  logout: (refresh: string) =>
    mockAware<void>(env.useMocks, () => Promise.resolve(), () => api.post('/auth/logout/', { refresh }).then(() => undefined)),

  me: () => mockAware<CurrentUser>(env.useMocks, () => Promise.resolve(mockCurrentUser), () => api.get<CurrentUser>('/auth/me/').then((r) => r.data)),

  updateMe: (payload: Partial<Pick<CurrentUser, 'first_name' | 'middle_name' | 'last_name'>> & { phone?: string }) =>
    mockAware<CurrentUser>(
      env.useMocks,
      () => Promise.resolve({ ...mockCurrentUser, ...payload }),
      () => api.patch<CurrentUser>('/auth/me/', payload).then((r) => r.data),
    ),

  changePassword: (payload: { current_password: string; new_password: string }) =>
    mockAware<void>(
      env.useMocks,
      () => Promise.resolve(),
      () => api.post('/auth/change-password/', payload).then(() => undefined),
    ),

  twoFactorStatus: () =>
    mockAware<{ enabled: boolean; pending_setup: boolean; recovery_codes_left: number }>(
      env.useMocks,
      () => Promise.resolve(mockTwoFactorStatus),
      () => api.get<{ enabled: boolean; pending_setup: boolean; recovery_codes_left: number }>('/auth/2fa/').then((r) => r.data),
    ),

  twoFactorSetup: (password: string) =>
    mockAware<{ secret: string; otpauth_uri: string }>(
      env.useMocks,
      () => Promise.resolve({ secret: 'MOCK2FASECRETDEMO', otpauth_uri: 'otpauth://totp/EducationERP:demo?secret=MOCK2FASECRETDEMO&issuer=EducationERP' }),
      () => api.post<{ secret: string; otpauth_uri: string }>('/auth/2fa/setup/', { password }).then((r) => r.data),
    ),

  twoFactorConfirm: (code: string) =>
    mockAware<{ recovery_codes: string[] }>(
      env.useMocks,
      () => Promise.resolve({ recovery_codes: ['AAAA-1111', 'BBBB-2222', 'CCCC-3333', 'DDDD-4444'] }),
      () => api.post<{ recovery_codes: string[] }>('/auth/2fa/confirm/', { code }).then((r) => r.data),
    ),

  twoFactorRecoveryCodes: (code: string) =>
    mockAware<{ recovery_codes: string[] }>(
      env.useMocks,
      () => Promise.resolve({ recovery_codes: ['EEEE-5555', 'FFFF-6666', 'GGGG-7777', 'HHHH-8888'] }),
      () => api.post<{ recovery_codes: string[] }>('/auth/2fa/recovery-codes/', { code }).then((r) => r.data),
    ),

  twoFactorDisable: (payload: { password: string; code: string }) =>
    mockAware<void>(
      env.useMocks,
      () => Promise.resolve(),
      () => api.post('/auth/2fa/disable/', payload).then(() => undefined),
    ),
}
