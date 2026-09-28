import type { ListParams, PaginatedEnvelope } from '@/lib/api/types'
import { mockFilter, mockPaginate } from './pagination'

let nextMockId = 100000

/**
 * An in-memory stand-in for `createCrudApi`, operating directly on the
 * `store` array reference it's given (never cloned) so a resource's custom
 * actions — e.g. `studentsApi.changeStatus` — can mutate the same array and
 * have the change show up on the next `list`/`get` call.
 */
export function createMockCrudApi<T extends { id: number }, TCreate = Partial<T>, TUpdate = Partial<T>>(
  store: T[],
  searchFields: (keyof T)[] = [],
) {
  return {
    list: async (params?: ListParams): Promise<PaginatedEnvelope<T>> =>
      mockPaginate(mockFilter(store, params, searchFields), params),

    get: async (id: number | string): Promise<T> => {
      const found = store.find((item) => item.id === Number(id))
      if (!found) throw new Error(`Not found (mock id ${String(id)})`)
      return found
    },

    create: async (payload: TCreate): Promise<T> => {
      const record = { ...(payload as object), id: nextMockId++ } as T
      store.unshift(record)
      return record
    },

    update: async (id: number | string, payload: TUpdate): Promise<T> => {
      const idx = store.findIndex((item) => item.id === Number(id))
      if (idx === -1) throw new Error(`Not found (mock id ${String(id)})`)
      store[idx] = { ...store[idx], ...(payload as object) }
      return store[idx]
    },

    patch: async (id: number | string, payload: Partial<TUpdate>): Promise<T> => {
      const idx = store.findIndex((item) => item.id === Number(id))
      if (idx === -1) throw new Error(`Not found (mock id ${String(id)})`)
      store[idx] = { ...store[idx], ...(payload as object) }
      return store[idx]
    },

    remove: async (id: number | string): Promise<void> => {
      const idx = store.findIndex((item) => item.id === Number(id))
      if (idx !== -1) store.splice(idx, 1)
    },
  }
}

/** Picks the mock or real implementation based on env.useMocks at the call site. */
export function mockAware<T>(useMocks: boolean, mockFn: () => Promise<T>, realFn: () => Promise<T>): Promise<T> {
  return useMocks ? mockFn() : realFn()
}
