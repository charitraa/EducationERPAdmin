import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type Role = Schema<'Role'>
export type RoleInput = Schema<'RoleRequest'>
export type Permission = Schema<'Permission'>

export const rolesApi = createResourceApi<Role, RoleInput>('/roles/')
export const roleKeys = createQueryKeys('roles')

/** The whole catalogue in one unpaginated list. */
export const permissionsApi = {
  list: () => apiClient.get<Permission[]>('/permissions/').then((r) => r.data),
}
export const permissionKeys = createQueryKeys('permissions')
