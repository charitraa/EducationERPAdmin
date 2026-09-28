import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaginatedEnvelope } from '@/lib/api/types'
import { createQueryKeys } from './keys'

interface ResourceApi<T, TCreate, TUpdate, TParams> {
  list: (params?: TParams) => Promise<PaginatedEnvelope<T>>
  get: (id: number) => Promise<T>
  create: (payload: TCreate) => Promise<T>
  update: (id: number, payload: TUpdate) => Promise<T>
  patch: (id: number, payload: Partial<TUpdate>) => Promise<T>
  remove: (id: number | string) => Promise<unknown>
}

/** Standard list/detail/create/update/patch/delete query+mutation hooks for a
 * DRF router-backed resource, wired to invalidate the list on any write.
 * The returned `keys` factory is exported too, so a feature's own custom
 * mutations (e.g. a status-change action) can invalidate the same cache
 * entries without redeclaring the resource's key shape. */
export function createResourceHooks<T, TCreate, TUpdate, TParams extends object = object>(
  resource: string,
  api: ResourceApi<T, TCreate, TUpdate, TParams>,
) {
  const keys = createQueryKeys<TParams>(resource)

  function useList(params?: TParams) {
    return useQuery({
      queryKey: keys.list(params),
      queryFn: () => api.list(params),
      placeholderData: keepPreviousData,
    })
  }

  function useDetail(id: number | null) {
    return useQuery({
      queryKey: keys.detail(id as number),
      queryFn: () => api.get(id as number),
      enabled: id !== null,
    })
  }

  function useCreate() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: api.create,
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.lists() }),
    })
  }

  function useUpdate() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: TUpdate }) => api.update(id, payload),
      onSuccess: (_data, vars) => {
        qc.invalidateQueries({ queryKey: keys.lists() })
        qc.invalidateQueries({ queryKey: keys.detail(vars.id) })
      },
    })
  }

  function usePatch() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: Partial<TUpdate> }) => api.patch(id, payload),
      onSuccess: (_data, vars) => {
        qc.invalidateQueries({ queryKey: keys.lists() })
        qc.invalidateQueries({ queryKey: keys.detail(vars.id) })
      },
    })
  }

  function useRemove() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: api.remove,
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.lists() }),
    })
  }

  return { keys, useList, useDetail, useCreate, useUpdate, usePatch, useRemove }
}
