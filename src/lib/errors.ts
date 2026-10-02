import { toast } from 'sonner'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toApiError, type ApiError } from '@/shared/api/errors'
import { t } from '@/lib/i18n'

/** The one sentence to show a person for an error, by HTTP status. */
export function errorMessage(err: unknown): string {
  const e = toApiError(err)
  switch (e.status) {
    case 403:
      return t('errors.forbidden')
    case 404:
      return t('errors.notFound')
    case 429:
      return t('errors.tooManyRequests')
    case 405:
      return t('errors.notAllowed')
    default:
      // 400 and 409 messages are written for school staff: show them as-is.
      return e.message || t('errors.generic')
  }
}

/** Global toast for errors nobody handles in place (actions, not forms). */
export function notifyError(err: unknown) {
  const e = toApiError(err)
  if (e.status === 401) return // the client is already redirecting to /login
  toast.error(errorMessage(e), { id: `${e.status}:${e.code}` })
}

/**
 * Put a 400's `details` under the matching fields. Returns the message for the
 * banner above the form, plus any errors whose field the form doesn't have.
 */
export function applyServerErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): string | null {
  const e: ApiError = toApiError(err)
  if (e.status !== 400) return errorMessage(e)
  const leftovers: string[] = [...e.generalErrors]
  let onFields = 0
  for (const [field, message] of Object.entries(e.fieldErrors)) {
    if (knownFields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message })
      onFields++
    } else leftovers.push(`${field.replace(/_/g, ' ')}: ${message}`)
  }
  const hint = onFields > 0 ? 'Check the highlighted fields.' : ''
  return [e.message, hint, ...leftovers].filter(Boolean).join(' ')
}
