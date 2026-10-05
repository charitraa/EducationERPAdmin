import NepaliDate from 'nepali-date-converter'
import { tr } from '@/lib/i18n'

/**
 * The backend's canonical dates are AD `YYYY-MM-DD`. BS (Bikram Sambat) is
 * shown alongside for reading only and is never sent back.
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parse `YYYY-MM-DD` as a local calendar date (no timezone shift). */
export function parseIsoDate(value: string | null | undefined): Date | null {
  const m = value ? ISO_DATE.exec(value) : null
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayIso = () => toIsoDate(new Date())

/** `2026-10-02` → `2083-06-16`; null when out of the converter's range. */
export function toBsDate(value: string | Date | null | undefined, format = 'YYYY-MM-DD'): string | null {
  const date = value instanceof Date ? value : parseIsoDate(value ?? null)
  if (!date) return null
  try {
    return new NepaliDate(date).format(format)
  } catch {
    return null
  }
}

/** Display an AD date as stored: `2026-10-02`. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return value.slice(0, 10)
}

/** `2026-10-02T09:15:00Z` → `2026-10-02 15:00` in the viewer's local time. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${toIsoDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "3 min ago", "yesterday", or the date. */
export function formatRelative(value: string, now = new Date()): string {
  const d = new Date(value)
  const seconds = Math.round((now.getTime() - d.getTime()) / 1000)
  if (seconds < 60) return tr('just now')
  if (seconds < 3600) return tr('{minutes} min ago', { minutes: Math.floor(seconds / 60) })
  if (seconds < 86400) return tr('{hours} h ago', { hours: Math.floor(seconds / 3600) })
  if (seconds < 172800) return tr('yesterday')
  return toIsoDate(d)
}

/** A local AD date and `HH:MM` → the API's datetime (UTC ISO). */
export function combineLocal(date: string, hhmm: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  return new Date(y!, m! - 1, d!, h, min).toISOString()
}

/** The API's datetime → the local AD date and `HH:MM` it falls on, for date and time fields. */
export function splitLocal(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  return { date: toIsoDate(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
}
