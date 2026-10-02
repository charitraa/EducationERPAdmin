import type { components } from '@/shared/api/schema.gen'

/** Every schema in the backend contract, e.g. `Schema<'Campus'>`. */
export type Schemas = components['schemas']
export type Schema<K extends keyof Schemas> = Schemas[K]

export type Id = number

/** Envelope every backend list is wrapped in. */
export interface Paginated<T> {
  count: number
  total_pages: number
  page: number
  page_size: number
  next: string | null
  previous: string | null
  results: T[]
}

/** The standard list query: page, size, text search, ordering, plus named filters. */
export interface ListParams {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  [filter: string]: string | number | boolean | undefined
}

export interface ApiErrorBody {
  code: string
  message: string
  /** Usually `{ field: [messages] }`; values can also be strings or nested objects. */
  details?: Record<string, unknown> | unknown[] | null
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody
}

export const MAX_PAGE_SIZE = 200
