import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { Id, ListParams } from '@/shared/types/api'
import type { QueryKeys, ResourceApi } from './resource'

interface ResourceHookOptions {
  /** Other caches a write here makes stale (e.g. terms when an academic year changes). */
  alsoInvalidate?: QueryKey[]
}

/**
 * Standard TanStack Query hooks for one resource:
 * Page → useX() → xApi.list() → apiClient → backend.
 *
 * Create/update mutations are marked `form` (400s go on the fields, not a toast);
 * delete is `silent` because DeleteDialog shows the 409 message in place.
 */
export function createResourceHooks<T, TInput>(api: ResourceApi<T, TInput>, keys: QueryKeys, opts: ResourceHookOptions = {}) {
  function useInvalidate() {
    const qc = useQueryClient()
    return () => {
      void qc.invalidateQueries({ queryKey: keys.all })
      for (const key of opts.alsoInvalidate ?? []) void qc.invalidateQueries({ queryKey: key })
    }
  }

  return {
    useList(params: ListParams = {}, options: { enabled?: boolean } = {}) {
      return useQuery({
        queryKey: keys.list(params),
        queryFn: () => api.list(params),
        placeholderData: keepPreviousData,
        ...options,
      })
    },
    useOne(id: Id | null | undefined) {
      return useQuery({
        queryKey: keys.detail(id ?? 0),
        queryFn: () => api.get(id!),
        enabled: id != null,
      })
    },
    useCreate() {
      const invalidate = useInvalidate()
      return useMutation({ mutationFn: (input: TInput) => api.create(input), meta: { form: true }, onSuccess: invalidate })
    },
    useUpdate() {
      const qc = useQueryClient()
      const invalidate = useInvalidate()
      return useMutation({
        mutationFn: ({ id, input }: { id: Id; input: Partial<TInput> }) => api.update(id, input),
        meta: { form: true },
        onSuccess: (data, { id }) => {
          qc.setQueryData(keys.detail(id), data)
          invalidate()
        },
      })
    },
    useRemove() {
      const invalidate = useInvalidate()
      return useMutation({ mutationFn: (id: Id) => api.remove(id), meta: { silent: true }, onSuccess: invalidate })
    },
  }
}
