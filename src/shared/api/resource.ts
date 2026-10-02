import { compact } from '@/lib/utils'
import type { Id, ListParams, Paginated } from '@/shared/types/api'
import { apiClient } from './client'

/**
 * The list/retrieve/create/update/delete set every DRF router resource has.
 * Feature `*.api.ts` files build on this and add their own actions
 * (e.g. `set-current`) next to it. Only expose `remove` where the endpoint
 * index lists a DELETE for that resource.
 */
export function createResourceApi<T, TInput = Partial<T>>(basePath: string) {
  const url = (id: Id) => `${basePath}${id}/`
  return {
    list: (params: ListParams = {}) =>
      apiClient.get<Paginated<T>>(basePath, { params: compact(params) }).then((r) => r.data),
    get: (id: Id) => apiClient.get<T>(url(id)).then((r) => r.data),
    create: (input: TInput) => apiClient.post<T>(basePath, input).then((r) => r.data),
    update: (id: Id, input: Partial<TInput>) => apiClient.patch<T>(url(id), input).then((r) => r.data),
    remove: (id: Id) => apiClient.delete(url(id)).then(() => undefined),
    url,
  }
}

export type ResourceApi<T, TInput> = ReturnType<typeof createResourceApi<T, TInput>>

/**
 * Hierarchical query keys: `keys.all` invalidates everything for a resource,
 * `keys.lists()` every list, `keys.detail(id)` one record.
 *   ['programs'] ⊃ ['programs', 'list', {...filters}] and ['programs', 'detail', 7]
 */
export function createQueryKeys(resource: string) {
  const all = [resource] as const
  return {
    all,
    lists: () => [...all, 'list'] as const,
    list: (params: ListParams = {}) => [...all, 'list', compact(params)] as const,
    details: () => [...all, 'detail'] as const,
    detail: (id: Id) => [...all, 'detail', id] as const,
  }
}

export type QueryKeys = ReturnType<typeof createQueryKeys>
