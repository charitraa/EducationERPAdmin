import { useQuery } from '@tanstack/react-query'
import { rolesApi, type Role, type RolePayload } from '@/lib/api/roles'
import { permissionsApi } from '@/lib/api/permissions'
import { createResourceHooks } from '@/lib/query/useResource'
import type { ListParams } from '@/lib/api/types'

export const {
  useList: useRoles,
  useDetail: useRole,
  useCreate: useCreateRole,
  useUpdate: useUpdateRole,
} = createResourceHooks<Role, RolePayload, RolePayload, ListParams>('roles', rolesApi)

export function usePermissionCatalogue() {
  return useQuery({
    queryKey: ['permissions', 'catalogue'],
    queryFn: () => permissionsApi.list(),
    staleTime: Infinity,
  })
}
