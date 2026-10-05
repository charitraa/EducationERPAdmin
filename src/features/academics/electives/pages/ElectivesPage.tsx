import { ListChecks, Loader2, Users } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { SearchInput } from '@/components/common/SearchInput'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { DatePicker } from '@/components/forms/DatePicker'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { errorMessage } from '@/lib/errors'
import { tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { flattenMessages, toApiError } from '@/shared/api/errors'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import { useAcademicYearOptions, useCurrentAcademicYear } from '../../academic-years/hooks/useAcademicYears'
import type { SectionStudent } from '../../classes/api/classes.api'
import { useClasses } from '../../classes/hooks/useClasses'
import { SectionHeader } from '../../components/SectionHeader'
import { useProgramCurriculum } from '../../curriculum/hooks/useCurriculum'
import type { StudentElective } from '../api/electives.api'
import { useAddElective, useClassElectives, useDropElective, useSectionStudents } from '../hooks/useElectives'

/** A 400's field messages ("…is taught at the same time as Biology") read better than its generic summary. */
function refusal(err: unknown) {
  const e = toApiError(err)
  const parts = e.status === 400 ? flattenMessages(e.details) : []
  return parts.length ? parts.join(' ') : errorMessage(e)
}

/**
 * Who takes which elective in one class. The backend lists only these
 * students on an elective's roll call, mark sheet and exam roster, so a class
 * with electives isn't ready until everyone's choice is recorded here.
 */
export default function ElectivesPage() {
  const [params, setParams] = useSearchParams()
  const ids = { year: useId(), section: useId(), from: useId() }
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission(PERMS.students.place)
  const { selectedBranchId } = useBranches()
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  // This year's classes by default; another year for choices in a class students move into later.
  const year = params.get('year') ?? (current.data ? String(current.data.id) : '')
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: year || undefined, campus: selectedBranchId ?? undefined, ordering: 'level' })
  const sectionId = Number(params.get('section')) || null
  const section = classes.data?.results.find((c) => c.id === sectionId)
  const curriculum = useProgramCurriculum(section?.program ?? null)
  const students = useSectionStudents(sectionId)
  const choices = useClassElectives(sectionId)
  const add = useAddElective()
  const drop = useDropElective()
  const [from, setFrom] = useState('')
  const [search, setSearch] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [busy, setBusy] = useState<Set<string>>(new Set())

  const electives = useMemo(
    () => (curriculum.data?.results ?? []).filter((e) => section && e.level === section.level && e.is_elective),
    [curriculum.data, section],
  )
  // Open choices only: a dropped one is history and no longer puts the student on the roster.
  const taking = useMemo(() => {
    const map = new Map<string, StudentElective>()
    for (const c of choices.data?.results ?? []) if (!c.ended_on) map.set(`${c.student_id}:${c.subject}`, c)
    return map
  }, [choices.data])
  const countFor = (subject: number) => (students.data ?? []).filter((s) => taking.has(`${s.id}:${subject}`)).length
  const hasAny = (s: SectionStudent) => electives.some((e) => taking.has(`${s.id}:${e.subject}`))
  const missing = (students.data ?? []).filter((s) => !hasAny(s))
  const q = search.trim().toLowerCase()
  const shown = (students.data ?? []).filter(
    (s) => (!onlyMissing || !hasAny(s)) && (!q || s.full_name.toLowerCase().includes(q) || s.student_number.toLowerCase().includes(q)),
  )

  const toggle = async (student: SectionStudent, subject: number, subjectName: string) => {
    const key = `${student.id}:${subject}`
    if (busy.has(key)) return
    setBusy((b) => new Set(b).add(key))
    const choice = taking.get(key)
    try {
      if (choice) {
        await drop.mutateAsync(choice)
        toast.success(tr('{name} no longer takes {subject}.', { name: student.full_name, subject: subjectName }))
      } else {
        await add.mutateAsync({ student: student.id, subject, in_section: sectionId!, started_on: from || undefined })
      }
    } catch (err) {
      toast.error(tr('{name}: {message}', { name: student.full_name, message: refusal(err) }))
    } finally {
      setBusy((b) => {
        const next = new Set(b)
        next.delete(key)
        return next
      })
    }
  }

  const loading = section && (curriculum.isPending || students.isPending || choices.isPending)
  const failed = [curriculum, students, choices].find((x) => x.isError)

  return (
    <>
      <SectionHeader
        title={tr('Electives')}
        description={tr('Who takes which optional subject. Roll calls, mark sheets and exam rosters for an elective list only the students who take it.')}
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grid w-full gap-1.5 sm:w-48">
          <Label htmlFor={ids.year}>{tr('Academic year')}</Label>
          <SelectControl
            id={ids.year}
            value={year}
            onChange={(v) => setParams(v ? { year: v } : {}, { replace: true })}
            loading={years.isPending}
            placeholder={tr('All years')}
            options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.is_current ? tr('{name} (current)', { name: y.name }) : y.name }))}
          />
        </div>
        <div className="grid w-full gap-1.5 sm:w-64">
          <Label htmlFor={ids.section}>{tr('Class')}</Label>
          <SelectControl
            id={ids.section}
            value={sectionId ? String(sectionId) : ''}
            onChange={(v) => setParams((prev) => {
              const next = new URLSearchParams(prev)
              if (v) next.set('section', v)
              else next.delete('section')
              return next
            }, { replace: true })}
            loading={classes.isPending}
            placeholder={tr('Choose a class…')}
            options={(classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.display_name }))}
          />
        </div>
        {canEdit && section && (
          <div className="grid w-full gap-1.5 sm:w-48">
            <Label htmlFor={ids.from}>{tr('New choices start')}</Label>
            <DatePicker id={ids.from} value={from} onChange={setFrom} />
          </div>
        )}
        {canEdit && section && (
          <p className="pb-2 text-xs text-muted-foreground sm:max-w-xs">
            {from ? tr('Earlier registers and exams will include the student from this date.') : tr('Leave empty to start today.')}
          </p>
        )}
      </div>

      {!section ? (
        classes.isError ? (
          <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />
        ) : (
          <EmptyState
            icon={ListChecks}
            title={sectionId && !classes.isPending ? tr('That class isn’t in this list') : tr('Choose a class')}
            description={tr('Pick a class to see its elective subjects and who takes each one.')}
          />
        )
      ) : failed ? (
        <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />
      ) : loading ? (
        <TableSkeleton rows={8} columns={4} />
      ) : electives.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={tr('{name} has no elective subjects', { name: section.display_name })}
          description={tr('Every subject at this level is compulsory, so every student takes all of them. Mark subjects as electives in the curriculum.')}
          action={
            <Button asChild variant="outline">
              <Link to={`/academics/curriculum?program=${section.program}`}>{tr('Open the curriculum')}</Link>
            </Button>
          }
        />
      ) : !students.data?.length ? (
        <EmptyState icon={Users} title={tr('No students in {name}', { name: section.display_name })} description={tr('Place students in this class first.')} />
      ) : (
        <>
          <ul className="mb-4 flex flex-wrap gap-2" aria-label={tr('Students per elective')}>
            {electives.map((e) => (
              <li key={e.subject} className="rounded-md border bg-card px-3 py-1.5 text-sm">
                <span className="font-medium">{e.subject_name}</span>{' '}
                <span className="tabular-nums text-muted-foreground">{tr('{count} of {total}', { count: countFor(e.subject), total: students.data.length })}</span>
              </li>
            ))}
          </ul>
          {missing.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              <span>
                {missing.length === 1
                  ? tr('1 student hasn’t chosen an elective yet, so they’re on no elective’s roll call or mark sheet.')
                  : tr('{count} students haven’t chosen an elective yet, so they’re on no elective’s roll call or mark sheet.', { count: missing.length })}
              </span>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOnlyMissing((o) => !o)}>
                {onlyMissing ? tr('Show everyone') : tr('Show only them')}
              </Button>
            </div>
          )}
          <div className="rounded-lg border bg-card">
            <div className="border-b p-2">
              <SearchInput value={search} onChange={setSearch} placeholder={tr('Find a student…')} className="sm:max-w-xs" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" aria-label={tr('Electives in {name}', { name: section.display_name })}>
                <thead>
                  <tr className="border-b bg-muted text-left text-xs font-medium text-muted-foreground">
                    <th scope="col" className="sticky left-0 bg-muted px-3 py-2">
                      {tr('Student')}
                    </th>
                    {electives.map((e) => (
                      <th key={e.subject} scope="col" className="min-w-24 px-3 py-2 text-center">
                        {e.subject_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shown.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <th scope="row" className="sticky left-0 bg-card px-3 py-2 text-left font-normal">
                        <Link to={`/students/${s.id}`} className="font-medium hover:underline">
                          {s.full_name}
                        </Link>
                        <div className="font-mono text-xs text-muted-foreground">{s.student_number}</div>
                      </th>
                      {electives.map((e) => {
                        const key = `${s.id}:${e.subject}`
                        const pending = busy.has(key)
                        return (
                          <td key={e.subject} className="px-3 py-2 text-center">
                            <span className={cn('inline-flex h-9 w-9 items-center justify-center')}>
                              {pending ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={tr('Saving…')} />
                              ) : (
                                <Checkbox
                                  checked={taking.has(key)}
                                  disabled={!canEdit}
                                  onCheckedChange={() => void toggle(s, e.subject, e.subject_name)}
                                  aria-label={tr('{name} takes {subject}', { name: s.full_name, subject: e.subject_name })}
                                  className="h-5 w-5"
                                />
                              )}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={electives.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                        {tr('No student matches.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {!canEdit && <p className="mt-3 text-xs text-muted-foreground">{tr('Only people who can place students in classes can change choices.')}</p>}
        </>
      )}
    </>
  )
}
