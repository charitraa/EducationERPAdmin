import axios from 'axios'
import type { ApiErrorBody, ApiErrorEnvelope } from '@/shared/types/api'

/**
 * Every message inside a `details` value. The backend sends lists of strings
 * (`{"name": ["…"]}`), plain strings, and sometimes nested objects
 * (`{"code": {"code": "This code is already in use…"}}`).
 */
export function flattenMessages(value: unknown): string[] {
  if (value === null || value === undefined) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flattenMessages)
  if (typeof value === 'object') return Object.values(value).flatMap(flattenMessages)
  return [String(value)]
}

/** One normalized error for everything the API (or the network) can throw. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number | undefined
  readonly details: ApiErrorBody['details']

  constructor(body: ApiErrorBody, status?: number) {
    super(body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.status = status
    this.details = body.details ?? null
  }

  /** `details` as `{ field: "message" }`, for mapping onto form fields. */
  get fieldErrors(): Record<string, string> {
    const d = this.details
    if (!d || Array.isArray(d)) return {}
    const out: Record<string, string> = {}
    for (const [field, value] of Object.entries(d)) {
      if (field === 'non_field_errors') continue
      const messages = flattenMessages(value)
      if (messages.length) out[field] = messages.join(' ')
    }
    return out
  }

  /** Errors not tied to one field (`non_field_errors`, or a list). */
  get generalErrors(): string[] {
    const d = this.details
    if (!d) return []
    if (Array.isArray(d)) return flattenMessages(d)
    return flattenMessages(d.non_field_errors)
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Partial<ApiErrorEnvelope> | undefined
    if (data?.error?.code) return new ApiError(data.error, err.response?.status)
    if (!err.response) {
      return new ApiError({ code: 'network_error', message: "Can't reach the server. Check your connection." })
    }
    return new ApiError(
      { code: 'http_error', message: 'Something went wrong on the server. Please try again.' },
      err.response.status,
    )
  }
  return new ApiError({ code: 'unknown_error', message: err instanceof Error ? err.message : 'Something went wrong.' })
}

export const isStatus = (err: unknown, status: number) => toApiError(err).status === status
