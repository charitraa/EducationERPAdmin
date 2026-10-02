import { useQuery } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { permissionKeys, permissionsApi, roleKeys, rolesApi } from '../api/roles.api'

export const {
  useList: useRoles,
  useOne: useRole,
  useCreate: useCreateRole,
  useUpdate: useUpdateRole,
  useRemove: useRemoveRole,
} = createResourceHooks(rolesApi, roleKeys, { alsoInvalidate: [['users']] })

/** Every role the organization can grant (system roles and its own), for pickers. */
export function useRoleOptions(enabled = true) {
  const params = { ...PICKER_PARAMS, ordering: 'name' }
  return useQuery({ queryKey: roleKeys.list(params), queryFn: () => rolesApi.list(params), select: (p) => p.results, enabled, staleTime: 5 * 60_000 })
}

export function usePermissionCatalogue(enabled = true) {
  return useQuery({ queryKey: permissionKeys.all, queryFn: permissionsApi.list, enabled, staleTime: 30 * 60_000 })
}
