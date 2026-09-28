import { useQuery } from '@tanstack/react-query'
import { rolesApi, type Role, type RolePayload } from '@/lib/api/roles'
import { permissionsApi } from '@/lib/api/permissions'
import { createResourceHooks } from '@/lib/query/useResource'
import { queryKeys } from '@/lib/query/keys'
import type { ListParams } from '@/lib/api/types'

export const {
  keys: roleKeys,
  useList: useRoles,
  useDetail: useRole,
  useCreate: useCreateRole,
  useUpdate: useUpdateRole,
} = createResourceHooks<Role, RolePayload, RolePayload, ListParams>('roles', rolesApi)

export function usePermissionCatalogue(params?: { module?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.permissions.catalogue(params),
    queryFn: () => permissionsApi.list(params),
    staleTime: Infinity,
  })
}
