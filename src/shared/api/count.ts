import { useQuery } from '@tanstack/react-query'
import { compact } from '@/lib/utils'
import type { ListParams, Paginated } from '@/shared/types/api'
import { apiClient } from './client'

/**
 * How many records a list endpoint has, read from `count` with page_size=1.
 * The key starts with the resource name, so invalidating that resource
 * (e.g. ['sections']) refreshes the count too.
 */
export function useCount(resource: string, path: string, params: ListParams = {}, enabled = true) {
  return useQuery({
    queryKey: [resource, 'count', compact(params)],
    queryFn: () => apiClient.get<Paginated<unknown>>(path, { params: { ...compact(params), page: 1, page_size: 1 } }).then((r) => r.data.count),
    enabled,
    staleTime: 60_000,
  })
}
