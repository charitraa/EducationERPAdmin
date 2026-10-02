import { enumOptions } from '@/lib/formatters'
import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type User = Schema<'User'>
export type UserCreateInput = Schema<'UserCreateRequest'>
export type UserUpdateInput = Schema<'PatchedUserRequest'>
export type RoleAssignment = Schema<'RoleAssignment'>
export type AssignRoleInput = Schema<'AssignRoleRequest'>

/** API keys get the `integration` type; people never do. */
export const userTypeOptions = () => enumOptions('UserTypeEnum').filter((o) => o.value !== 'integration')

const base = createResourceApi<User, UserCreateInput>('/users/')

export const usersApi = {
  ...base,
  /** Create takes a password and role codes; edits take the plain profile. */
  edit: (id: Id, input: UserUpdateInput) => apiClient.patch<User>(base.url(id), input).then((r) => r.data),
  assignRole: (id: Id, input: AssignRoleInput) => apiClient.post<RoleAssignment>(`${base.url(id)}assign-role/`, input).then((r) => r.data),
  revokeRole: (id: Id, input: Pick<AssignRoleInput, 'role' | 'campus'>) => apiClient.post(`${base.url(id)}revoke-role/`, input).then(() => undefined),
  setPassword: (id: Id, newPassword: string) => apiClient.post(`${base.url(id)}set-password/`, { new_password: newPassword }).then(() => undefined),
  deactivate: (id: Id) => apiClient.post<User>(`${base.url(id)}deactivate/`).then((r) => r.data),
  resetTwoFactor: (id: Id) => apiClient.post(`${base.url(id)}reset-2fa/`).then(() => undefined),
}

export const userKeys = createQueryKeys('users')
