import { z } from 'zod'

/** Shared Zod pieces matching the backend's field rules. Form values stay strings; payload builders convert. */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
export const optionalIsoDate = z.union([z.literal(''), isoDate])

/** Slug codes: letters, numbers, - and _. */
export const code = z
  .string()
  .trim()
  .min(1, 'Required.')
  .max(50)
  .regex(/^[-a-zA-Z0-9_]+$/, 'Letters, numbers, - and _ only (no spaces).')

export const requiredId = (message = 'Choose one.') => z.string().min(1, message)
export const optionalId = z.string()

export const wholeNumber = (message = 'Enter a whole number.') => z.string().trim().regex(/^\d+$/, message)
export const optionalWholeNumber = z.union([z.literal(''), z.string().trim().regex(/^\d+$/, 'Enter a whole number.')])

/** '' → null, '7' → 7 */
export const toNullableInt = (v: string) => (v === '' ? null : Number(v))
export const toInt = (v: string) => Number(v)
