import { api } from './client'
import type { ListParams, PaginatedEnvelope } from './types'

/** Standard list/detail/create/update/delete set for a DRF router-backed resource. */
export function createCrudApi<T, TCreate = Partial<T>, TUpdate = Partial<T>>(basePath: string) {
  return {
    list: (params?: ListParams) => api.get<PaginatedEnvelope<T>>(basePath, { params }).then((r) => r.data),
    get: (id: number | string) => api.get<T>(`${basePath}${id}/`).then((r) => r.data),
    create: (payload: TCreate) => api.post<T>(basePath, payload).then((r) => r.data),
    update: (id: number | string, payload: TUpdate) => api.put<T>(`${basePath}${id}/`, payload).then((r) => r.data),
    patch: (id: number | string, payload: Partial<TUpdate>) =>
      api.patch<T>(`${basePath}${id}/`, payload).then((r) => r.data),
    remove: (id: number | string) => api.delete(`${basePath}${id}/`),
  }
}
