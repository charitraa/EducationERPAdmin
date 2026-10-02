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

export function setLocale(next: Locale) {
  locale = next
  try {
    localStorage.setItem(LOCALE_KEY, next)
  } catch {
    // per-viewer convenience only
  }
  document.documentElement.lang = next
  listeners.forEach((l) => l())
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
