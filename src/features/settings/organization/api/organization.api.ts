import { apiClient } from '@/shared/api/client'
import type { Id } from '@/shared/types/api'
import type { Organization, OrganizationUpdate } from '@/shared/types/organization'

export const organizationKeys = {
  all: ['organizations'] as const,
  detail: (id: Id) => ['organizations', 'detail', id] as const,
}

export const organizationApi = {
  get: (id: Id) => apiClient.get<Organization>(`/organizations/${id}/`).then((r) => r.data),
  update: (id: Id, input: OrganizationUpdate) => apiClient.patch<Organization>(`/organizations/${id}/`, input).then((r) => r.data),
}
