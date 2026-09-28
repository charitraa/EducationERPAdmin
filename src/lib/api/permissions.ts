import { api } from './client'
import { env } from '@/config/env'
import { mockAware } from '@/mocks/mock-crud'
import { mockFilter } from '@/mocks/pagination'
import { mockPermissions } from '@/mocks/data/permissions'

export interface Permission {
  id: number
  code: string
  module: string
  action: string
  name: string
  description: string
}

export const permissionsApi = {
  // Not paginated — the backend returns a plain array for this one endpoint.
  list: (params?: { module?: string; search?: string }) =>
    mockAware(
      env.useMocks,
      () => Promise.resolve(mockFilter(mockPermissions, params, ['name', 'code', 'description'])),
      () => api.get<Permission[]>('/permissions/', { params }).then((r) => r.data),
    ),
}
