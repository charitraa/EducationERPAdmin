import { tr } from '@/lib/i18n'
import { enumLabels, type EnumName } from '@/shared/api/enums.gen'

/** Backend enum value → the label the backend ships for it. Unknown values pass through. */
export function enumLabel(name: EnumName, value: string | null | undefined): string {
  if (!value) return '—'
  const label = (enumLabels[name] as Record<string, string>)[value]
  return label ? tr(label) : humanize(value)
}

export function enumOptions(name: EnumName): Array<{ value: string; label: string }> {
  return Object.entries(enumLabels[name] as Record<string, string>).map(([value, label]) => ({ value, label: tr(label) }))
}

/** `medical_leave` → `Medical leave` (through `tr()`: it is always shown to people). */
export function humanize(value: string): string {
  const s = value.replace(/[_-]+/g, ' ').trim()
  return tr(s.charAt(0).toUpperCase() + s.slice(1))
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** `pluralize(3, 'payslip')` → "3 payslips". The noun goes through `tr()`, so list it in the catalog. */
export function pluralize(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString()} ${tr(count === 1 ? one : many)}`
}
