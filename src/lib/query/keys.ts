/**
 * Hierarchical, typed query-key factories for TanStack Query.
 *
 * Pattern: every resource's keys share one root tuple, so a single
 * `invalidateQueries({ queryKey: keys.all })` can blow away everything for
 * that resource, while `keys.lists()` / `keys.detail(id)` invalidate more
 * narrowly (e.g. after an update, refresh that one detail view without
 * refetching every other resource's cache). See
 * https://tkdodo.eu/blog/effective-react-query-keys for the rationale.
 */
export function createQueryKeys<TParams = unknown>(resource: string) {
  const all = [resource] as const
  const lists = () => [...all, 'list'] as const
  const list = (params?: TParams) => [...lists(), params ?? {}] as const
  const details = () => [...all, 'detail'] as const
  const detail = (id: number | string) => [...details(), id] as const

  return { all, lists, list, details, detail }
}

export type ResourceKeys<TParams = unknown> = ReturnType<typeof createQueryKeys<TParams>>

/** One-off keys for endpoints that aren't a standard paginated list/detail resource. */
export const queryKeys = {
  auth: {
    twoFactor: ['auth', '2fa'] as const,
  },
  permissions: {
    catalogue: (params?: { module?: string; search?: string }) =>
      ['permissions', 'catalogue', params ?? {}] as const,
  },
}
