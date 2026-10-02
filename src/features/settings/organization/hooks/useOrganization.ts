import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { OrganizationUpdate } from '@/shared/types/organization'
import { authKeys } from '@/features/authentication/api/auth.api'
import { organizationApi, organizationKeys } from '../api/organization.api'

/**
 * The signed-in user's own organization. The id comes from `/auth/me/`, never
 * from the URL: the backend decides tenancy.
 */
export function useMyOrganization(enabled = true) {
  const { user } = useAuth()
  const id = user?.organization?.id
  return useQuery({
    queryKey: organizationKeys.detail(id ?? 0),
    queryFn: () => organizationApi.get(id!),
    enabled: enabled && id != null,
  })
}

export function useUpdateMyOrganization() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: OrganizationUpdate) => organizationApi.update(user!.organization!.id, input),
    meta: { form: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: organizationKeys.all })
      // The name in the sidebar and header comes from /auth/me/.
      void qc.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}
