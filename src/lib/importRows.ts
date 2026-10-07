import { tr } from '@/lib/i18n'

/**
 * Reading people's own spreadsheets into create requests: match the header
 * row to known columns (by key, English label or a common alias), then check
 * each row the way the server will, so problems show before anything is sent.
 */

export type ImportKind = 'text' | 'date' | 'email' | 'gender' | 'choice' | 'bool' | 'int'

export interface ImportColumn {
  /** The API field, and the template's header. */
  key: string
  label: string
  required?: boolean
  /** Other headers people use for it ("Reg No", "Surname"). */
  aliases?: string[]
  kind?: ImportKind
  /** For `choice`: normalised spellings → the API value. */
  choices?: Record<string, string>
  /** No two rows may share a value (an employee number). */
  unique?: boolean
}

export interface ImportRow {
  /** Line in the file, counting the header as 1. */
  line: number
  values: Record<string, string>
  /** Only the filled-in fields, converted for the API. */
  input: Record<string, unknown>
  problems: string[]
}

export interface ParsedImport {
  rows: ImportRow[]
  /** Header cells that match no column; their data is left out. */
  ignored: string[]
  /** Required columns the file doesn't have. */
  missing: string[]
}

export const normaliseHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '')

export const GENDERS: Record<string, string> = {
  m: 'male',
  male: 'male',
  boy: 'male',
  f: 'female',
  female: 'female',
  girl: 'female',
  o: 'other',
  other: 'other',
  undisclosed: 'undisclosed',
  prefernottosay: 'undisclosed',
}

const BOOLS: Record<string, boolean> = { yes: true, y: true, true: true, '1': true, no: false, n: false, false: false, '0': false }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const validDate = (v: string) => DATE.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v)

export function readImportRows(cells: string[][], columns: readonly ImportColumn[]): ParsedImport {
  const lookup = new Map<string, ImportColumn>()
  for (const c of columns) for (const name of [c.key, c.label, ...(c.aliases ?? [])]) if (normaliseHeader(name)) lookup.set(normaliseHeader(name), c)

  const [header = [], ...body] = cells
  const index = new Map<string, number>()
  const ignored: string[] = []
  header.forEach((h, i) => {
    const col = lookup.get(normaliseHeader(h))
    if (col && !index.has(col.key)) index.set(col.key, i)
    else if (h.trim()) ignored.push(h.trim())
  })
  const missing = columns.filter((c) => c.required && !index.has(c.key)).map((c) => c.label)

  const seen = new Map<string, Map<string, number>>()
  const rows = body.map((cellsOfRow, i): ImportRow => {
    const line = i + 2
    const values = Object.fromEntries(columns.map((c) => [c.key, index.has(c.key) ? (cellsOfRow[index.get(c.key)!] ?? '').trim() : '']))
    const problems: string[] = []
    const input: Record<string, unknown> = {}
    for (const c of columns) {
      const v = values[c.key]!
      if (!v) {
        if (c.required) problems.push(tr('{field} is empty.', { field: c.label }))
        continue
      }
      switch (c.kind ?? 'text') {
        case 'date':
          if (validDate(v)) input[c.key] = v
          else problems.push(tr('{field} should be an AD date like 2010-04-13.', { field: c.label }))
          break
        case 'email':
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) input[c.key] = v
          else problems.push(tr('{field} doesn’t look like an email address.', { field: c.label }))
          break
        case 'gender': {
          const g = GENDERS[normaliseHeader(v)]
          if (g) input[c.key] = g
          else problems.push(tr('Gender “{value}” isn’t one of male, female, other.', { value: v }))
          break
        }
        case 'choice': {
          const found = c.choices?.[normaliseHeader(v)]
          if (found) input[c.key] = found
          else problems.push(tr('{field} “{value}” isn’t one of {choices}.', { field: c.label, value: v, choices: [...new Set(Object.values(c.choices ?? {}))].join(', ') }))
          break
        }
        case 'bool': {
          const b = BOOLS[v.toLowerCase()]
          if (b !== undefined) input[c.key] = b
          else problems.push(tr('{field} should be yes or no.', { field: c.label }))
          break
        }
        case 'int':
          if (/^\d+$/.test(v)) input[c.key] = Number(v)
          else problems.push(tr('{field} should be a whole number.', { field: c.label }))
          break
        default:
          input[c.key] = v
      }
      if (c.unique) {
        const taken = seen.get(c.key) ?? new Map<string, number>()
        seen.set(c.key, taken)
        const k = v.toLowerCase()
        if (taken.has(k)) problems.push(tr('Same {field} as line {line}.', { field: c.label, line: taken.get(k)! }))
        else taken.set(k, line)
      }
    }
    return { line, values, input, problems }
  })
  return { rows, ignored, missing }
}
