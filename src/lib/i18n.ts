import { useSyncExternalStore } from 'react'
import { en, type MessageKey } from '@/locales/en'
import { ne } from '@/locales/ne'

export type Locale = 'en' | 'ne'
const LOCALE_KEY = 'erp.locale'
const catalogs: Record<Locale, Partial<Record<MessageKey, string>>> = { en, ne }

function initialLocale(): Locale {
  try {
    return localStorage.getItem(LOCALE_KEY) === 'ne' ? 'ne' : 'en'
  } catch {
    return 'en'
  }
}

let locale: Locale = initialLocale()
const listeners = new Set<() => void>()
if (typeof document !== 'undefined') document.documentElement.lang = locale

/**
 * Nepali page text, keyed by the English. Only fetched for Nepali readers; the
 * top-level await holds back every module that imports this one, so labels
 * built when a module loads (columns, options, form messages) are translated too.
 */
const pageText: Record<string, string> = locale === 'ne' ? (await import('@/locales/ne-text')).neText : {}

export function setLocale(next: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, next)
  } catch {
    // per-viewer convenience only
  }
  if (next === locale) return
  locale = next
  document.documentElement.lang = next
  listeners.forEach((l) => l())
  // Labels are fixed when their module loads, so start afresh in the new language.
  window.location.reload()
}

/**
 * Page text in the reader's language: `tr('Save changes')`, or with values
 * `tr('{count} students', { count })`. The English is the key, so a missing
 * translation simply shows the English.
 */
export function tr(text: string, vars?: Record<string, unknown>): string {
  return fill(pageText[text] ?? text, vars)
}

/**
 * `tr()` for an English word with two meanings: `trc('verb', 'Open')` (a
 * button) vs `tr('Open')` (a status). The catalog key is `verb|Open`; without
 * one it falls back to plain `tr('Open')`.
 */
export function trc(context: string, text: string, vars?: Record<string, unknown>): string {
  return fill(pageText[`${context}|${text}`] ?? pageText[text] ?? text, vars)
}

function fill(text: string, vars?: Record<string, unknown>): string {
  let out = text
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v))
  return out
}

/** `t('nav.students')`, with `{name}` placeholders filled from `vars`. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let text = catalogs[locale][key] ?? en[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
  return text
}

/** Re-render on language change. Components call `useLocale()` once, then use `t()`. */
export function useLocale() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => locale,
  )
}

export type { MessageKey }
