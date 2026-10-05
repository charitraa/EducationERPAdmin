import { CalendarRange, UserSearch } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { DatePicker } from '@/components/forms/DatePicker'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { useDebounce } from '@/hooks/useDebounce'
import { parseIsoDate, toIsoDate, todayIso } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { TONE_CLASSES } from '@/shared/constants/statuses'
import { STATUS_SHORT, STATUS_TONE, STATUSES, type Summary } from '../api/attendance.api'
import { useDefaulters, useRegister, useStudentReport } from '../hooks/useAttendance'
import { tr } from '@/lib/i18n'

const VIEWS = [
  { value: 'register', label: tr('Class register') },
  { value: 'defaulters', label: tr('Defaulters') },
  { value: 'student', label: tr('One student') },
] as const

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toIsoDate(d)
}

/** URL-kept report parameters; the backend defaults to the last 30 days. */
function useReportParams() {
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const set = (k: string, v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v) next.set(k, v)
        else next.delete(k)
        return next
      },
      { replace: true },
    )
  const from = get('from') || daysAgo(30)
  const to = get('to') || todayIso()
  const valid = parseIsoDate(from) != null && parseIsoDate(to) != null && from <= to
  return { get, set, from, to, valid }
}

function Field({ label, children, className }: { label: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId()
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
    </div>
  )
}

const pct = (p: number | null) => (p == null ? '—' : `${p}%`)

function Percent({ value, below = 75 }: { value: number | null; below?: number }) {
  return <span className={cn('font-medium tabular-nums', value != null && value < below && 'text-danger')}>{pct(value)}</span>
}

function useSectionOptions() {
  const { selectedBranchId } = useBranches()
  const current = useCurrentAcademicYear()
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: current.data?.id, campus: selectedBranchId ?? undefined, ordering: 'level' })
  return (classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.display_name }))
}

function RegisterView({ r }: { r: ReturnType<typeof useReportParams> }) {
  const sections = useSectionOptions()
  const section = r.get('section')
  const register = useRegister({ section: section ? Number(section) : null, from: r.from, to: r.to })
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label={tr('Class')} className="min-w-48">
          {(id) => <SelectControl id={id} value={section} onChange={(v) => r.set('section', v)} options={sections} placeholder={tr('Choose a class…')} />}
        </Field>
      </div>
      {!section ? (
        <EmptyState title={tr('Choose a class')} description={tr('The register shows every student against every session in the dates above.')} icon={CalendarRange} />
      ) : register.isPending ? (
        <TableSkeleton rows={8} columns={8} />
      ) : register.isError ? (
        <ErrorState error={register.error} onRetry={() => void register.refetch()} />
      ) : register.data.sessions.length === 0 ? (
        <EmptyState title={tr('No attendance in these dates')} description={tr('Nothing was taken for {section_name} between {from} and {to}.', { section_name: register.data.section_name, from: r.from, to: r.to })} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-xs" aria-label={tr('Register for {section_name}', { section_name: register.data.section_name })}>
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th scope="col" className="sticky left-0 z-10 min-w-44 bg-muted px-3 py-2 text-left font-medium">
                  {tr('Student')}
                </th>
                {register.data.sessions.map((s) => (
                  <th key={s.session} scope="col" className="px-1 py-2 text-center font-medium" title={[s.date, s.subject_name, s.status === 'open' ? tr('not submitted') : null].filter(Boolean).join(' · ')}>
                    <Link to={`/attendance/sessions/${s.session}`} className={cn('block hover:underline', s.status === 'open' && 'italic')}>
                      <span className="block tabular-nums">{s.date.slice(5)}</span>
                      {s.subject_name && <span className="block max-w-14 truncate font-normal">{s.subject_name}</span>}
                    </Link>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {tr('Attended')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {register.data.students.map((row) => (
                <tr key={row.enrollment}>
                  <th scope="row" className="sticky left-0 bg-card px-3 py-1.5 text-left font-normal">
                    <span className="block text-sm font-medium">{row.student_name}</span>
                    <span className="font-mono text-muted-foreground">{row.student_number}</span>
                  </th>
                  {row.marks.map((m, i) => (
                    <td key={register.data.sessions[i]!.session} className="px-1 py-1.5 text-center">
                      {m ? (
                        <span className={cn('inline-block min-w-7 rounded border px-1 py-0.5 font-semibold', TONE_CLASSES[STATUS_TONE[m]])} title={enumLabel('AttendanceStatusEnum', m)}>
                          {STATUS_SHORT[m]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground" title={tr('Not marked')}>
                          ·
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-1.5 text-right">
                    <Percent value={row.percentage} /> <span className="text-muted-foreground">({row.attended}/{row.total})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            {tr('{map}. Excused, leave and medical leave don’t count against the percentage. Italic dates aren’t submitted yet.', { map: STATUSES.map((s) => `${STATUS_SHORT[s]} ${enumLabel('AttendanceStatusEnum', s)}`).join(' · ') })}
          </p>
        </div>
      )}
    </>
  )
}

function DefaultersView({ r }: { r: ReturnType<typeof useReportParams> }) {
  const sections = useSectionOptions()
  const section = r.get('section')
  const [below, setBelow] = useState(r.get('below') || '75')
  const belowValue = useDebounce(below, 400)
  const n = Number(belowValue)
  const valid = belowValue !== '' && Number.isFinite(n) && n > 0 && n <= 100
  const report = useDefaulters({ from: r.from, to: r.to, below: valid ? n : 75, section: section ? Number(section) : undefined })
  const sectionName = (id: number) => sections.find((s) => s.value === String(id))?.label ?? ''
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label={tr('Class')} className="min-w-48">
          {(id) => <SelectControl id={id} value={section} onChange={(v) => r.set('section', v)} options={sections} allowEmpty emptyLabel={tr('All classes')} />}
        </Field>
        <Field label={tr('Below (%)')} className="w-28">
          {(id) => (
            <Input
              id={id}
              inputMode="decimal"
              value={below}
              onChange={(e) => {
                setBelow(e.target.value)
                r.set('below', e.target.value === '75' ? '' : e.target.value)
              }}
              aria-invalid={!valid}
            />
          )}
        </Field>
      </div>
      {report.isPending ? (
        <TableSkeleton rows={6} columns={5} />
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : report.data.students.length === 0 ? (
        <EmptyState title={tr('Nobody is below {below}%', { below: report.data.below })} description={tr('Every student with attendance in these dates is at or above the threshold.')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm" aria-label={tr('Defaulters')}>
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{tr('Student')}</th>
                <th className="px-3 py-2">{tr('Class')}</th>
                <th className="px-3 py-2 text-right">{tr('Present')}</th>
                <th className="px-3 py-2 text-right">{tr('Absent')}</th>
                <th className="px-3 py-2 text-right">{tr('Late')}</th>
                <th className="px-3 py-2 text-right">{tr('Sessions')}</th>
                <th className="px-3 py-2 text-right">{tr('Attended')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.data.students.map((d) => (
                <tr key={`${d.student}-${d.section}`}>
                  <td className="px-3 py-2">
                    <Link to={`?view=student&student=${d.student}&from=${r.from}&to=${r.to}`} className="font-medium hover:underline">
                      {d.student_name}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{d.student_number}</span>
                  </td>
                  <td className="px-3 py-2">{sectionName(d.section)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.present}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.absent}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.late}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.total}</td>
                  <td className="px-3 py-2 text-right">
                    <Percent value={d.percentage} below={report.data.below} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function SummaryCard({ title, s }: { title: string; s: Summary }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        <Percent value={s.percentage} />
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {tr('{attended} attended of {total} sessions', { attended: s.attended, total: s.total })}
        {STATUSES.filter((st) => s[st]).map((st) => ` · ${s[st]} ${enumLabel('AttendanceStatusEnum', st).toLowerCase()}`)}
      </p>
    </div>
  )
}

function StudentView({ r }: { r: ReturnType<typeof useReportParams> }) {
  const [student, setStudent] = useState<Student | null>(null)
  const id = student?.id ?? (r.get('student') ? Number(r.get('student')) : null)
  const report = useStudentReport({ student: id, from: r.from, to: r.to })
  return (
    <>
      <div className="mb-4 max-w-md">
        <Field label={tr('Student')}>
          {(fid) => (
            <StudentPicker
              id={fid}
              value={student}
              onChange={(s) => {
                setStudent(s)
                r.set('student', s ? String(s.id) : '')
              }}
            />
          )}
        </Field>
      </div>
      {id == null ? (
        <EmptyState title={tr('Find a student')} description={tr('Their attendance overall, for the daily roll call, and per subject.')} icon={UserSearch} />
      ) : report.isPending ? (
        <TableSkeleton rows={4} columns={4} />
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : (
        <div className="grid gap-4">
          <h2 className="text-base font-semibold">{report.data.student_name}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard title={tr('Overall')} s={report.data.overall} />
            <SummaryCard title={tr('Daily roll call')} s={report.data.daily} />
          </div>
          {report.data.subjects.length > 0 && (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm" aria-label={tr('Attendance per subject')}>
                <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">{tr('Subject')}</th>
                    <th className="px-3 py-2 text-right">{tr('Present')}</th>
                    <th className="px-3 py-2 text-right">{tr('Absent')}</th>
                    <th className="px-3 py-2 text-right">{tr('Late')}</th>
                    <th className="px-3 py-2 text-right">{tr('Lessons')}</th>
                    <th className="px-3 py-2 text-right">{tr('Attended')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.data.subjects.map((s) => (
                    <tr key={s.subject}>
                      <td className="px-3 py-2 font-medium">{s.subject_name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.present}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.absent}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.late}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.total}</td>
                      <td className="px-3 py-2 text-right">
                        <Percent value={s.percentage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}

/** The class register, students under a percentage, and one student's attendance. */
export default function ReportsPage() {
  const r = useReportParams()
  const view = VIEWS.find((v) => v.value === r.get('view'))?.value ?? 'register'
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-md border p-0.5" role="tablist" aria-label={tr('Report')}>
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => r.set('view', v.value === 'register' ? '' : v.value)}
              className={cn('rounded px-3 py-1.5 text-sm', view === v.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {v.label}
            </button>
          ))}
        </div>
        <Field label={tr('From (AD)')}>{(id) => <DatePicker id={id} value={r.from} onChange={(v) => r.set('from', v)} />}</Field>
        <Field label={tr('To (AD)')}>{(id) => <DatePicker id={id} value={r.to} onChange={(v) => r.set('to', v)} />}</Field>
      </div>
      {!r.valid ? (
        <EmptyState title={tr('Check the dates')} description={tr('Give a from date on or before the to date (at most 400 days apart).')} />
      ) : view === 'register' ? (
        <RegisterView r={r} />
      ) : view === 'defaulters' ? (
        <DefaultersView r={r} />
      ) : (
        <StudentView r={r} />
      )}
    </>
  )
}
