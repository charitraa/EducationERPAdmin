import { organizationsApi, type Organization, type OrganizationPayload } from '@/lib/api/organizations'
import { createResourceHooks } from '@/lib/query/useResource'
import type { ListParams } from '@/lib/api/types'

export const {
  useList: useOrganizations,
  useDetail: useOrganization,
  useCreate: useCreateOrganization,
  useUpdate: useUpdateOrganization,
} = createResourceHooks<Organization, OrganizationPayload, OrganizationPayload, ListParams>(
  'organizations',
  organizationsApi,
)
