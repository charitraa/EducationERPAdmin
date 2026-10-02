import { MAX_PAGE_SIZE, type ListParams, type Paginated } from '@/shared/types/api'

export const DEFAULT_PAGE_SIZE = 25
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const

export const clampPageSize = (size: number) => Math.min(Math.max(1, size), MAX_PAGE_SIZE)

/** Enough to read `count` from a list endpoint without fetching rows. */
export const COUNT_ONLY: ListParams = { page: 1, page_size: 1 }

/** Pickers (selects, comboboxes) load one big page; the backend caps it at 200. */
export const PICKER_PARAMS: ListParams = { page: 1, page_size: MAX_PAGE_SIZE }

export function emptyPage<T>(): Paginated<T> {
  return { count: 0, total_pages: 0, page: 1, page_size: DEFAULT_PAGE_SIZE, next: null, previous: null, results: [] }
}
