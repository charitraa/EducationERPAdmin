import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { clampPageSize, DEFAULT_PAGE_SIZE } from '@/shared/api/pagination'
import type { ListParams } from '@/shared/types/api'

/**
 * List state (page, page size, search, ordering, filters) kept in the URL,
 * so a filtered list survives reload and can be shared as a link.
 * Changing anything but the page sends you back to page 1.
 */
export function useListState(opts: { filters?: readonly string[]; defaultOrdering?: string } = {}) {
  const [params, setParams] = useSearchParams()
  const filterNames = opts.filters ?? []

  const state = useMemo(() => {
    const filters: Record<string, string | undefined> = {}
    for (const name of filterNames) filters[name] = params.get(name) ?? undefined
    return {
      page: Math.max(1, Number(params.get('page')) || 1),
      pageSize: clampPageSize(Number(params.get('page_size')) || DEFAULT_PAGE_SIZE),
      search: params.get('search') ?? '',
      ordering: params.get('ordering') ?? opts.defaultOrdering ?? '',
      filters,
    }
    // filterNames is fixed for the lifetime of a page.
  }, [params, opts.defaultOrdering])

  const update = useCallback(
    (changes: Record<string, string | number | undefined>, keepPage = false) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(changes)) {
            if (v === undefined || v === '' || (k === 'page' && v === 1)) next.delete(k)
            else next.set(k, String(v))
          }
          if (!keepPage) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const activeFilterCount = Object.values(state.filters).filter(Boolean).length

  return {
    ...state,
    activeFilterCount,
    isFiltered: activeFilterCount > 0 || state.search !== '',
    /** Query params to pass straight to `api.list()`. */
    query: {
      page: state.page,
      page_size: state.pageSize,
      search: state.search || undefined,
      ordering: state.ordering || undefined,
      ...state.filters,
    } satisfies ListParams as ListParams,
    setPage: (page: number) => update({ page }, true),
    setPageSize: (size: number) => update({ page_size: size }),
    setSearch: (search: string) => update({ search }),
    setOrdering: (ordering: string) => update({ ordering }),
    setFilter: (name: string, value: string | undefined) => update({ [name]: value }),
    clearFilters: () => update({ search: undefined, ...Object.fromEntries(filterNames.map((f) => [f, undefined])) }),
  }
}

export type ListState = ReturnType<typeof useListState>
