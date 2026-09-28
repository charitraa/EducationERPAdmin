import type { ListParams, PaginatedEnvelope } from '@/lib/api/types'

/** Slices an in-memory array into the same envelope shape the real API returns. */
export function mockPaginate<T>(items: T[], params?: ListParams): PaginatedEnvelope<T> {
  const page = params?.page ?? 1
  const pageSize = params?.page_size ?? 20
  const start = (page - 1) * pageSize
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  return {
    count: items.length,
    total_pages: totalPages,
    page,
    page_size: pageSize,
    next: page < totalPages ? String(page + 1) : null,
    previous: page > 1 ? String(page - 1) : null,
    results: items.slice(start, start + pageSize),
  }
}

/**
 * Applies the same `?search=` / exact-match filter params the DRF backend
 * supports, against an in-memory array. `page`, `page_size` and `ordering`
 * are ignored here (ordering isn't simulated; pagination is mockPaginate's job).
 */
export function mockFilter<T extends object>(
  items: T[],
  params: Record<string, unknown> | undefined,
  searchFields: (keyof T)[] = [],
): T[] {
  if (!params) return items
  let result = items
  const { page: _page, page_size: _pageSize, ordering: _ordering, search, ...filters } = params

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '') continue
    result = result.filter((item) => String((item as Record<string, unknown>)[key]) === String(value))
  }

  if (search) {
    const q = String(search).toLowerCase()
    result = result.filter((item) =>
      searchFields.some((field) => String((item as Record<string, unknown>)[field as string] ?? '').toLowerCase().includes(q)),
    )
  }

  return result
}
