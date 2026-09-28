import { api } from './client'
import { createCrudApi } from './crud'
import { env } from '@/config/env'
import { createMockCrudApi, mockAware } from '@/mocks/mock-crud'
import { mockUsers } from '@/mocks/data/users'
import { mockRoles } from '@/mocks/data/roles'
import { mockCampuses } from '@/mocks/data/campuses'
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

const base = env.useMocks
  ? createMockCrudApi<User, UserPayload>(mockUsers, ['full_name', 'email'])
  : createCrudApi<User, UserPayload>('/users/')

export const usersApi = {
  ...base,
  deactivate: (id: number, payload: UserPayload) =>
    mockAware<User>(
      env.useMocks,
      () => base.update(id, payload),
      () => api.post<User>(`/users/${id}/deactivate/`, payload).then((r) => r.data),
    ),
  setPassword: (id: number, new_password: string) =>
    mockAware<void>(
      env.useMocks,
      () => Promise.resolve(),
      () => api.post(`/users/${id}/set-password/`, { new_password }).then(() => undefined),
    ),
  reset2fa: (id: number) =>
    mockAware<void>(env.useMocks, () => Promise.resolve(), () => api.post(`/users/${id}/reset-2fa/`).then(() => undefined)),
  roles: (id: number) =>
    mockAware<RoleAssignment[]>(
      env.useMocks,
      () => Promise.resolve(mockUsers.find((u) => u.id === id)?.role_assignments ?? []),
      () => api.get<RoleAssignment[]>(`/users/${id}/roles/`).then((r) => r.data),
    ),
  assignRole: (id: number, payload: { role: number; campus?: number | null; expires_at?: string | null }) =>
    mockAware<RoleAssignment>(
      env.useMocks,
      () => {
        const user = mockUsers.find((u) => u.id === id)
        const role = mockRoles.find((r) => r.id === payload.role)
        const campus = payload.campus ? mockCampuses.find((c) => c.id === payload.campus) : null
        const assignment: RoleAssignment = {
          id: Date.now(),
          role: payload.role,
          role_code: role?.code ?? '',
          role_name: role?.name ?? 'Unknown role',
          campus: payload.campus ?? null,
          campus_name: campus?.name ?? null,
          expires_at: payload.expires_at ?? null,
          created_at: new Date().toISOString(),
        }
        if (user) user.role_assignments = [...user.role_assignments, assignment]
        return Promise.resolve(assignment)
      },
      () => api.post<RoleAssignment>(`/users/${id}/assign-role/`, payload).then((r) => r.data),
    ),
  revokeRole: (id: number, payload: { role: number; campus?: number | null }) =>
    mockAware<void>(
      env.useMocks,
      () => {
        const user = mockUsers.find((u) => u.id === id)
        if (user) {
          user.role_assignments = user.role_assignments.filter(
            (ra) => !(ra.role === payload.role && ra.campus === (payload.campus ?? null)),
          )
        }
        return Promise.resolve()
      },
      () => api.post(`/users/${id}/revoke-role/`, payload).then(() => undefined),
    ),
}
