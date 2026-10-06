import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { UnsavedChangesDialog } from '@/components/forms/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useAcademicYearOptions, useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { classKeys } from '@/features/academics/classes/api/classes.api'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { downloadCsv, parseCsv } from '@/lib/csv'
import { errorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { toApiError } from '@/shared/api/errors'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import { studentKeys, studentsApi } from '../api/students.api'
import { IMPORT_COLUMNS, readStudentRows, type ImportKey, type ParsedImport } from '../lib/studentImport'
import { tr } from '@/lib/i18n'

type Outcome = { state: 'added'; id: Id; placeError?: string } | { state: 'failed'; message: string }

const LABEL = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, c.label])) as Record<ImportKey, string>

/** "Student no.: already in use. Email: …" from a 400, or the plain message. */
function rowError(err: unknown) {
  const e = toApiError(err)
  const fields = Object.entries(e.fieldErrors).map(([f, m]) => `${LABEL[f as ImportKey] ?? f}: ${m}`)
  return fields.length ? fields.join(' ') : errorMessage(err)
}

function downloadTemplate() {
  downloadCsv('students-template.csv', [IMPORT_COLUMNS.map((c) => c.key), ['2082-001', 'Asha', '', 'Tamang', 'female', '2010-04-13', '', '9800000000', 'Kathmandu', '']])
}

/**
 * Add many students from a spreadsheet: read the CSV in the browser, show
 * what will be added and what's wrong, then create them one by one through
 * the normal endpoint so every server rule still applies.
 */
export default function StudentImportPage() {
  const qc = useQueryClient()
  const { isMultiBranch, branches, defaultBranchId } = useBranches()
  const fileInput = useRef<HTMLInputElement>(null)
  const stop = useRef(false)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [campus, setCampus] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({})
  const [running, setRunning] = useState(false)
  const [allowOver, setAllowOver] = useState(false)

  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const chosenCampus = campus || (defaultBranchId ? String(defaultBranchId) : '')
  const chosenYear = year || String(current.data?.id ?? years.data?.[0]?.id ?? '')
  const classes = useClasses({ ...PICKER_PARAMS, campus: chosenCampus || undefined, academic_year: chosenYear || undefined, ordering: 'level' }, { enabled: Boolean(chosenYear) })

  const ready = parsed?.rows.filter((r) => !r.problems.length) ?? []
  const pending = ready.filter((r) => outcomes[r.line]?.state !== 'added')
  const added = Object.values(outcomes).filter((o) => o.state === 'added').length
  const failed = parsed?.rows.filter((r) => r.problems.length || outcomes[r.line]?.state === 'failed') ?? []
  const chosenClass = classes.data?.results.find((c) => String(c.id) === section)
  const unplaced = parsed?.rows.filter((r) => { const o = outcomes[r.line]; return o?.state === 'added' && o.placeError }) ?? []
  const overflows = chosenClass?.capacity != null && chosenClass.student_count + Math.max(pending.length, unplaced.length) > chosenClass.capacity
  const blocker = useUnsavedChanges(running || (pending.length > 0 && added > 0))

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setReadError(null)
    setOutcomes({})
    try {
      const result = readStudentRows(parseCsv(await file.text()))
      setFileName(file.name)
      setParsed(result)
      if (!result.rows.length) setReadError(tr('The file has a header row but no students under it.'))
    } catch {
      setParsed(null)
      setReadError(tr('Couldn’t read that file. Save it from your spreadsheet as CSV (UTF-8) and try again.'))
    }
  }

  const place = async (id: Id) => {
    try {
      await studentsApi.place(id, { section: Number(section), allow_over_capacity: allowOver })
      return undefined
    } catch (err) {
      return errorMessage(err)
    }
  }

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: studentKeys.all })
    void qc.invalidateQueries({ queryKey: classKeys.all })
  }

  const placeAgain = async () => {
    setRunning(true)
    for (const row of unplaced) {
      const o = outcomes[row.line] as Extract<Outcome, { state: 'added' }>
      const placeError = await place(o.id)
      setOutcomes((prev) => ({ ...prev, [row.line]: { ...o, placeError } }))
    }
    setRunning(false)
    refresh()
  }

  const run = async () => {
    if (!parsed || !chosenCampus) return
    stop.current = false
    setRunning(true)
    for (const row of pending) {
      if (stop.current) break
      let outcome: Outcome
      try {
        const student = await studentsApi.create({ ...row.input, campus: Number(chosenCampus) })
        outcome = { state: 'added', id: student.id }
        if (section) outcome.placeError = await place(student.id)
      } catch (err) {
        outcome = { state: 'failed', message: rowError(err) }
      }
      setOutcomes((prev) => ({ ...prev, [row.line]: outcome }))
    }
    setRunning(false)
    refresh()
  }

  const downloadProblems = () =>
    downloadCsv('students-to-fix.csv', [
      [...IMPORT_COLUMNS.map((c) => c.key), 'problem'],
      ...failed.map((r) => [...IMPORT_COLUMNS.map((c) => r.values[c.key]), r.problems.join(' ') || (outcomes[r.line] as { message?: string })?.message || '']),
    ])

  return (
    <div className="grid gap-5">
      <PageHeader
        backTo="/students"
        title={tr('Import students')}
        description={tr('Add a whole class or school at once from a spreadsheet. Nothing is saved until you press Import.')}
        actions={
          <Button variant="outline" onClick={downloadTemplate}>
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
          {tr('Required: student_number, first_name, last_name. Optional: middle_name, gender (male, female, other), date_of_birth and admitted_on as AD dates like 2010-04-13, email, phone, address.')}
        </p>
        <FormError message={readError} />
        {parsed && parsed.missing.length > 0 && <FormError message={tr('The file has no column for: {columns}.', { columns: parsed.missing.join(', ') })} />}
        {parsed && parsed.ignored.length > 0 && <p className="text-sm text-muted-foreground">{tr('These columns are left out: {columns}.', { columns: parsed.ignored.join(', ') })}</p>}
      </section>

      {parsed && parsed.rows.length > 0 && parsed.missing.length === 0 && (
        <>
          <section className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-3 sm:p-5">
            {isMultiBranch && (
              <FormField label={tr('Branch')} required>
                {(p) => <SelectControl {...p} value={chosenCampus} onChange={(v) => (setCampus(v), setSection(''))} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} disabled={running} />}
              </FormField>
            )}
            <FormField label={tr('Academic year')}>
              {(p) => <SelectControl {...p} value={chosenYear} onChange={(v) => (setYear(v), setSection(''))} options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.name }))} disabled={running} />}
            </FormField>
            <FormField label={tr('Place them in class')} description={tr('Optional. Leave empty to place them later.')}>
              {(p) => (
                <SelectControl
                  {...p}
                  value={section}
                  onChange={setSection}
                  allowEmpty
                  emptyLabel={tr('Not now')}
                  loading={classes.isLoading}
                  disabled={running}
                  options={(classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: `${c.display_name} · ${c.capacity != null ? `${c.student_count}/${c.capacity}${c.student_count >= c.capacity ? ' ' + tr('full') : ''}` : pluralize(c.student_count, 'student')}` }))}
                />
              )}
            </FormField>
            {section && overflows && (
              <label className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm sm:col-span-3">
                <Checkbox checked={allowOver} onCheckedChange={(c) => setAllowOver(c === true)} disabled={running} className="mt-0.5" />
                <span>
                  <span className="font-medium">{tr('Place anyway, over the class’s seat limit')}</span>
                  <span className="block text-xs text-muted-foreground">{tr('The class will have more students than its capacity.')}</span>
                </span>
              </label>
            )}
          </section>

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
              {!running && section && unplaced.length > 0 && (
                <Button variant="outline" onClick={placeAgain}>
                  {tr('Place {count} again', { count: pluralize(unplaced.length, 'student') })}
                </Button>
              )}
              {!running && added > 0 && (
                <Button asChild variant={pending.length ? 'outline' : 'default'}>
                  <Link to="/students">{tr('See students')}</Link>
                </Button>
              )}
              {running ? (
                <Button variant="outline" onClick={() => (stop.current = true)}>
                  <Loader2 className="animate-spin" aria-hidden /> {tr('Stop')}
                </Button>
              ) : (
                pending.length > 0 && (
                  <Button onClick={run} disabled={!chosenCampus}>
                    {pending.some((r) => outcomes[r.line]) ? tr('Try {count} again', { count: pluralize(pending.length, 'student') }) : tr('Import {count}', { count: pluralize(pending.length, 'student') })}
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
                    <th className="px-3 py-2">{tr('Student no.')}</th>
                    <th className="px-3 py-2">{tr('Name')}</th>
                    <th className="hidden px-3 py-2 md:table-cell">{tr('Gender')}</th>
                    <th className="hidden px-3 py-2 md:table-cell">{tr('Date of birth')}</th>
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
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.values.student_number || '—'}</td>
                        <td className="px-3 py-2">{[r.values.first_name, r.values.middle_name, r.values.last_name].filter(Boolean).join(' ') || '—'}</td>
                        <td className="hidden px-3 py-2 md:table-cell">{r.input.gender ?? '—'}</td>
                        <td className="hidden whitespace-nowrap px-3 py-2 tabular-nums md:table-cell">{r.values.date_of_birth || '—'}</td>
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
                                <Link to={`/students/${o.id}`} className="hover:underline">
                                  {tr('Added')}
                                </Link>
                                {o.placeError && <span className="block text-xs text-warning">{tr('Not placed in the class: {message}', { message: o.placeError })}</span>}
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
