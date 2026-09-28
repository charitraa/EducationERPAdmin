import axios from 'axios'
import type { ApiErrorBody, ApiErrorEnvelope } from './types'

/** Friendly copy for backend error codes worth overriding the raw message for. */
const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password.',
  otp_required: 'Enter the 6-digit code from your authenticator app.',
  invalid_otp: 'That authenticator code is wrong or expired.',
  over_capacity: 'This section is already at capacity.',
  same_campus: "That's already this student's campus.",
  different_campus: 'Move the student to this campus first, then place them into a section.',
  invalid_status: 'This student is not currently enrolled, so this action is not available.',
  year_ended: 'That academic year has already ended.',
  same_section: 'The student is already in that section.',
  no_open_enrollment: 'This student has no open enrollment.',
  note_required: 'A note is required for this action.',
}

export class ApiError extends Error {
  code: string
  details: ApiErrorBody['details']
  status?: number

  constructor(body: ApiErrorBody, status?: number) {
    super(CODE_MESSAGES[body.code] || body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.details = body.details
    this.status = status
  }

  /** Field-level validation errors, if the backend sent any (e.g. {"email": ["..."]}). */
  fieldErrors(): Record<string, string> | null {
    if (!this.details || Array.isArray(this.details)) return null
    const entries = Object.entries(this.details).filter(
      ([key, val]) => key !== 'non_field_errors' && Array.isArray(val),
    )
    if (entries.length === 0) return null
    return Object.fromEntries(entries.map(([k, v]) => [k, (v as string[]).join(' ')]))
  }
}

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorEnvelope | undefined
    if (data?.error) {
      return new ApiError(data.error, err.response?.status)
    }
    return new ApiError(
      { code: 'network_error', message: err.message || 'Network error. Please try again.', details: null },
      err.response?.status,
    )
  }
  if (err instanceof Error) {
    return new ApiError({ code: 'unknown_error', message: err.message, details: null })
  }
  return new ApiError({ code: 'unknown_error', message: 'Something went wrong.', details: null })
}
