import { apiClient } from '@/shared/api/client'
import { publicClient } from '@/shared/api/publicClient'
import { createQueryKeys } from '@/shared/api/resource'
import type { Id, ListParams, Paginated } from '@/shared/types/api'
import type { LoginResponse } from '@/shared/types/auth'

/** `GET /signup/config/`. */
export interface SignupConfig {
  enabled: boolean
  requires_approval: boolean
  captcha_provider: 'off' | 'turnstile' | 'hcaptcha' | 'recaptcha'
  captcha_site_key: string
  organization_types: Array<{ value: string; label: string }>
}

export interface StartSignupBody {
  organization_name: string
  organization_code: string
  organization_type: string
  timezone: string
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  captcha_token?: string
}

/** `GET /signup/check-code/`. */
export interface CodeAvailability {
  code: string
  available: boolean
  reason: 'invalid' | 'reserved' | 'taken' | null
}

export type SignupStatus = 'pending' | 'awaiting_approval' | 'completed' | 'rejected'

/** `POST /signup/verify/`: 201 signs in at once; 202 waits for a platform admin. */
export type Verified =
  | ({ status: SignupStatus; organization: { id: Id; name: string; code: string } } & LoginResponse)
  | { status: SignupStatus; organization: null }

export interface SignupRequest {
  id: Id
  organization_name: string
  organization_code: string
  organization_type: string
  timezone: string
  admin_email: string
  admin_first_name: string
  admin_last_name: string
  admin_phone: string
  status: SignupStatus
  token_expires_at: string | null
  verified_at: string | null
  decided_at: string | null
  decided_by: Id | null
  rejection_reason: string
  organization: Id | null
  ip_address: string | null
  created_at: string
  updated_at: string
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const signupApi = {
  config: () => data(publicClient.get<SignupConfig>('/signup/config/')),
  checkCode: (code: string) => data(publicClient.get<CodeAvailability>('/signup/check-code/', { params: { code } })),
  start: (body: StartSignupBody) => data(publicClient.post<{ detail: string }>('/signup/', body)),
  resend: (email: string, captcha_token?: string) => data(publicClient.post<{ detail: string }>('/signup/resend/', { email, captcha_token })),
  verify: (token: string) => data(publicClient.post<Verified>('/signup/verify/', { token })),
}

export const passwordResetApi = {
  request: (email: string) => data(publicClient.post<{ detail: string }>('/auth/password-reset/', { email })),
  confirm: (body: { uid: string; token: string; new_password: string }) => publicClient.post('/auth/password-reset/confirm/', body).then(() => undefined),
}

/** Platform admins only. */
export const signupRequestsApi = {
  list: (params: ListParams) => data(apiClient.get<Paginated<SignupRequest>>('/signup-requests/', { params })),
  approve: (id: Id) => data(apiClient.post<SignupRequest>(`/signup-requests/${id}/approve/`)),
  reject: (id: Id, reason: string) => data(apiClient.post<SignupRequest>(`/signup-requests/${id}/reject/`, { reason })),
}

export const signupKeys = { config: ['signup', 'config'] as const, requests: createQueryKeys('signup-requests') }
