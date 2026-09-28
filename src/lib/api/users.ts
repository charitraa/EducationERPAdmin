import { api } from './client'
import { createCrudApi } from './crud'
import type { UserType } from './types'

export interface RoleAssignment {
  id: number
  role: number
  role_code: string
  role_name: string
  campus: number | null
  campus_name: string | null
  expires_at: string | null
  created_at: string
}

export interface User {
  id: number
  email: string
  phone: string
  first_name: string
  middle_name: string
  last_name: string
  full_name: string
  organization: number | null
  user_type: UserType
  is_active: boolean
  is_staff: boolean
  date_joined: string
  last_login: string | null
  role_assignments: RoleAssignment[]
  created_at: string
  updated_at: string
}

export interface UserPayload {
  email: string
  phone?: string
  password?: string
  first_name: string
  middle_name?: string
  last_name: string
  user_type: UserType
  is_active?: boolean
  role_codes?: string[]
}

const base = createCrudApi<User, UserPayload>('/users/')

export const usersApi = {
  ...base,
  deactivate: (id: number, payload: UserPayload) =>
    api.post<User>(`/users/${id}/deactivate/`, payload).then((r) => r.data),
  setPassword: (id: number, new_password: string) => api.post(`/users/${id}/set-password/`, { new_password }),
  reset2fa: (id: number) => api.post(`/users/${id}/reset-2fa/`),
  roles: (id: number) => api.get<RoleAssignment[]>(`/users/${id}/roles/`).then((r) => r.data),
  assignRole: (id: number, payload: { role: number; campus?: number | null; expires_at?: string | null }) =>
    api.post<RoleAssignment>(`/users/${id}/assign-role/`, payload).then((r) => r.data),
  revokeRole: (id: number, payload: { role: number; campus?: number | null }) =>
    api.post(`/users/${id}/revoke-role/`, payload),
}
