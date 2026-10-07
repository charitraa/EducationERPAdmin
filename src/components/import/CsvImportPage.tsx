import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { UnsavedChangesDialog } from '@/components/forms/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { downloadCsv, parseCsv } from '@/lib/csv'
import { errorMessage } from '@/lib/errors'
import { readImportRows, type ImportColumn, type ImportRow, type ParsedImport } from '@/lib/importRows'
import { cn } from '@/lib/utils'
import { toApiError } from '@/shared/api/errors'
import type { Id } from '@/shared/types/api'
import { tr } from '@/lib/i18n'

type Outcome = { state: 'added'; id: Id; afterError?: string } | { state: 'failed'; message: string }

/** A step run on each created record (placing a student in a class); returns an error message, if any. */
export interface AfterCreate {
  run: (id: Id) => Promise<string | undefined>
  /** "Not placed in the class: …" */
  failedLabel: (message: string) => string
  /** "Place 3 students again" */
  retryLabel: (count: number) => string
}

export interface CsvImportPageProps {
  title: string
  description: string
  backTo: string
  /** Where "See …" goes when done, and its label. */
  done: { to: string; label: string }
  /** "3 students", for the Import and Try again buttons. */
  countLabel: (count: number) => string
  fileStem: string
  columns: readonly ImportColumn[]
  /** One example row for the template, in column order. */
  example: string[]
  /** Shown in the preview table after the line number. */
  preview: Array<{ header: string; cell: (row: ImportRow) => ReactNode; className?: string }>
  create: (input: Record<string, unknown>, campus: Id) => Promise<{ id: Id }>
  linkTo: (id: Id) => string
  onFinished: () => void
  /** Extra choices (a class to place them in), given the branch and how many are left. */
  options?: (ctx: { campus: string; pending: number; running: boolean }) => ReactNode
  after?: AfterCreate | null
}

/** "student_number: Already in use." → "Student no.: Already in use." */
function rowError(err: unknown, labels: Record<string, string>) {
  const e = toApiError(err)
  const fields = Object.entries(e.fieldErrors).map(([f, m]) => `${labels[f] ?? f}: ${m}`)
  return fields.length ? fields.join(' ') : errorMessage(err)
}

/**
 * Add many records from a spreadsheet: read the CSV in the browser, show what
 * will be added and what's wrong, then create them one by one through the
 * normal endpoint, so every server rule still applies and each row gets the
 * server's own message.
 */
export function CsvImportPage(props: CsvImportPageProps) {
  const { columns, after } = props
  const { isMultiBranch, branches, defaultBranchId } = useBranches()
  const fileInput = useRef<HTMLInputElement>(null)
  const stop = useRef(false)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [campus, setCampus] = useState('')
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({})
  const [running, setRunning] = useState(false)

  const labels = Object.fromEntries(columns.map((c) => [c.key, c.label]))
  const chosenCampus = campus || (defaultBranchId ? String(defaultBranchId) : '')
  const ready = parsed?.rows.filter((r) => !r.problems.length) ?? []
  const pending = ready.filter((r) => outcomes[r.line]?.state !== 'added')
  const added = Object.values(outcomes).filter((o) => o.state === 'added').length
  const failed = parsed?.rows.filter((r) => r.problems.length || outcomes[r.line]?.state === 'failed') ?? []
  const afterFailed = parsed?.rows.filter((r) => { const o = outcomes[r.line]; return o?.state === 'added' && o.afterError }) ?? []
  const blocker = useUnsavedChanges(running || (pending.length > 0 && added > 0))

  const required = columns.filter((c) => c.required).map((c) => c.key)
  const optional = columns.filter((c) => !c.required).map((c) => c.key)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setReadError(null)
    setOutcomes({})
    try {
      const result = readImportRows(parseCsv(await file.text()), columns)
      setFileName(file.name)
      setParsed(result)
      if (!result.rows.length) setReadError(tr('The file has a header row but nothing under it.'))
    } catch {
      setParsed(null)
      setReadError(tr('Couldn’t read that file. Save it from your spreadsheet as CSV (UTF-8) and try again.'))
    }
  }

  const run = async () => {
    if (!parsed || !chosenCampus) return
    stop.current = false
    setRunning(true)
    for (const row of pending) {
      if (stop.current) break
      let outcome: Outcome
      try {
        const created = await props.create(row.input, Number(chosenCampus))
        outcome = { state: 'added', id: created.id }
        if (after) outcome.afterError = await after.run(created.id)
      } catch (err) {
        outcome = { state: 'failed', message: rowError(err, labels) }
      }
      setOutcomes((prev) => ({ ...prev, [row.line]: outcome }))
    }
    setRunning(false)
    props.onFinished()
  }

  const retryAfter = async () => {
    if (!after) return
    setRunning(true)
    for (const row of afterFailed) {
      const o = outcomes[row.line] as Extract<Outcome, { state: 'added' }>
      const afterError = await after.run(o.id)
      setOutcomes((prev) => ({ ...prev, [row.line]: { ...o, afterError } }))
    }
    setRunning(false)
    props.onFinished()
  }

  const downloadProblems = () =>
    downloadCsv(`${props.fileStem}-to-fix.csv`, [
      [...columns.map((c) => c.key), 'problem'],
      ...failed.map((r) => [...columns.map((c) => r.values[c.key]), r.problems.join(' ') || (outcomes[r.line] as { message?: string })?.message || '']),
    ])

  return (
    <div className="grid gap-5">
      <PageHeader
        backTo={props.backTo}
        title={props.title}
        description={props.description}
        actions={
          <Button variant="outline" onClick={() => downloadCsv(`${props.fileStem}-template.csv`, [columns.map((c) => c.key), props.example])}>
            <Download aria-hidden /> {tr('Download template')}
          </Button>
        }
      />
      <UnsavedChangesDialog blocker={blocker} />

      <section className="grid gap-4 rounded-lg border bg-card p-4 sm:p-5">
        <ol className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
          <li>{tr('1. Fill in the template, or use your own sheet with the same column names.')}</li>
          <li>{tr('2. Save it as CSV (in Excel: File › Save as › CSV UTF-8).')}</li>
          <li>{tr('3. Choose the file, check the rows, and import.')}</li>
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} aria-label={tr('CSV file')} />
          <Button onClick={() => fileInput.current?.click()} disabled={running} variant={parsed ? 'outline' : 'default'}>
            <Upload aria-hidden /> {parsed ? tr('Choose another file') : tr('Choose CSV file')}
          </Button>
          {fileName && (
            <span className="flex items-center gap-1.5 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" aria-hidden /> {fileName}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {tr('Required: {required}. Optional: {optional}. Dates are AD, like 2010-04-13.', { required: required.join(', '), optional: optional.join(', ') })}
        </p>
        <FormError message={readError} />
        {parsed && parsed.missing.length > 0 && <FormError message={tr('The file has no column for: {columns}.', { columns: parsed.missing.join(', ') })} />}
        {parsed && parsed.ignored.length > 0 && <p className="text-sm text-muted-foreground">{tr('These columns are left out: {columns}.', { columns: parsed.ignored.join(', ') })}</p>}
      </section>

      {parsed && parsed.rows.length > 0 && parsed.missing.length === 0 && (
        <>
          {(isMultiBranch || props.options) && (
            <section className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-3 sm:p-5">
              {isMultiBranch && (
                <FormField label={tr('Branch')} required>
                  {(p) => <SelectControl {...p} value={chosenCampus} onChange={setCampus} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} disabled={running} />}
                </FormField>
              )}
              {props.options?.({ campus: chosenCampus, pending: pending.length, running })}
            </section>
          )}

          <section className="rounded-lg border bg-card">
            <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
              <h2 className="mr-auto font-semibold">
                {tr('{ready} of {total} rows ready', { ready: ready.length, total: parsed.rows.length })}
                {added > 0 && <span className="ml-2 text-sm font-normal text-success">{tr('{added} added', { added })}</span>}
              </h2>
              {failed.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadProblems} disabled={running}>
                  <Download aria-hidden /> {tr('Rows to fix (CSV)')}
                </Button>
              )}
              {!running && after && afterFailed.length > 0 && (
                <Button variant="outline" onClick={retryAfter}>
                  {after.retryLabel(afterFailed.length)}
                </Button>
              )}
              {!running && added > 0 && (
                <Button asChild variant={pending.length ? 'outline' : 'default'}>
                  <Link to={props.done.to}>{props.done.label}</Link>
                </Button>
              )}
              {running ? (
                <Button variant="outline" onClick={() => (stop.current = true)}>
                  <Loader2 className="animate-spin" aria-hidden /> {tr('Stop')}
                </Button>
              ) : (
                pending.length > 0 && (
                  <Button onClick={run} disabled={!chosenCampus}>
                    {pending.some((r) => outcomes[r.line]) ? tr('Try {count} again', { count: props.countLabel(pending.length) }) : tr('Import {count}', { count: props.countLabel(pending.length) })}
                  </Button>
                )
              )}
            </header>
            {running && (
              <div className="h-1 bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={ready.length} aria-valuenow={added} aria-label={tr('Import progress')}>
                <div className="h-1 bg-primary transition-all" style={{ width: `${(Object.keys(outcomes).length / Math.max(pending.length + Object.keys(outcomes).length, 1)) * 100}%` }} />
              </div>
            )}
            <div className="relative max-h-[60vh] overflow-auto">
              <table className="w-full text-sm" aria-label={tr('Rows in the file')}>
                <thead className="sticky top-0 bg-muted text-left text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{tr('Line')}</th>
                    {props.preview.map((col) => (
                      <th key={col.header} className={cn('px-3 py-2', col.className)}>
                        {col.header}
                      </th>
                    ))}
                    <th className="px-3 py-2">{tr('Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsed.rows.map((r) => {
                    const o = outcomes[r.line]
                    const bad = r.problems.length > 0 || o?.state === 'failed'
                    return (
                      <tr key={r.line} className={cn(bad && 'bg-danger/5')}>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.line}</td>
                        {props.preview.map((col) => (
                          <td key={col.header} className={cn('px-3 py-2', col.className)}>
                            {col.cell(r)}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          {r.problems.length ? (
                            <span className="flex items-start gap-1.5 text-danger">
                              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {r.problems.join(' ')}
                            </span>
                          ) : o?.state === 'failed' ? (
                            <span className="flex items-start gap-1.5 text-danger">
                              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {o.message}
                            </span>
                          ) : o?.state === 'added' ? (
                            <span className="flex items-start gap-1.5">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                              <span>
                                <Link to={props.linkTo(o.id)} className="hover:underline">
                                  {tr('Added')}
                                </Link>
                                {o.afterError && after && <span className="block text-xs text-warning">{after.failedLabel(o.afterError)}</span>}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{tr('Ready')}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

/** The usual name preview: first, middle and last name. */
export const nameCell = (r: ImportRow) => [r.values.first_name, r.values.middle_name, r.values.last_name].filter(Boolean).join(' ') || '—'
