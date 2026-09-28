import { api } from './client'

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
    api.get<Permission[]>('/permissions/', { params }).then((r) => r.data),
}
