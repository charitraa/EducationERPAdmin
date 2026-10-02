import { apiClient } from '@/shared/api/client'
import type { CurrentUser, LoginRequest, LoginResponse } from '@/shared/types/auth'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

export const authApi = {
  login: (body: LoginRequest) => apiClient.post<LoginResponse>('/auth/login/', body).then((r) => r.data),
  logout: (refresh: string) => apiClient.post('/auth/logout/', { refresh }).then(() => undefined),
  me: () => apiClient.get<CurrentUser>('/auth/me/').then((r) => r.data),
}
