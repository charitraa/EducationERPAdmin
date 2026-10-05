import { Ban, CalendarOff, Pencil, UserRoundCog } from 'lucide-react'
import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { DatePicker } from '@/components/forms/DatePicker'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDate, parseIsoDate, todayIso } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import { hhmm, type Lesson } from '../api/timetable.api'
import { LessonChangeDialog } from '../components/LessonChangeDialog'
import { useDay } from '../hooks/useTimetable'
import { tr } from '@/lib/i18n'

/** One day as it actually runs: substitutes, room moves, cancellations and closures applied. */
export default function DayPage() {
  const [params, setParams] = useSearchParams()
  const date = params.get('date') ?? todayIso()
  const section = params.get('section') ?? ''
  const teacher = params.get('teacher') ?? ''
  const { can } = usePermissions()
  const manage = can(PERMS.timetable.manage)
  const { selectedBranchId, defaultBranchId } = useBranches()
  const current = useCurrentAcademicYear()
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: current.data?.id, campus: selectedBranchId ?? undefined, ordering: 'level' })
  const staff = useStaffOptions()
  const validDate = parseIsoDate(date) != null
  const day = useDay({ date, section: section || undefined, teacher: teacher || undefined }, validDate)
  const [changing, setChanging] = useState<Lesson | null>(null)
  const ids = { date: useId(), section: useId(), teacher: useId() }
  const campusOf = (l: Lesson) => classes.data?.results.find((c) => c.id === l.section)?.campus ?? selectedBranchId ?? defaultBranchId

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

  const lessons = [...(day.data ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.section_name.localeCompare(b.section_name))
  const changed = lessons.filter((l) => l.change != null).length

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={ids.date}>{tr('Date (AD)')}</Label>
          <DatePicker id={ids.date} value={date} onChange={(v) => set('date', v)} />
        </div>
        <div className="grid min-w-44 gap-1.5">
          <Label htmlFor={ids.section}>{tr('Class')}</Label>
          <SelectControl id={ids.section} value={section} onChange={(v) => set('section', v)} allowEmpty emptyLabel={tr('All classes')} options={(classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.display_name }))} />
        </div>
        {staff.canPick && (
          <div className="grid min-w-44 gap-1.5">
            <Label htmlFor={ids.teacher}>{tr('Teacher')}</Label>
            <SelectControl id={ids.teacher} value={teacher} onChange={(v) => set('teacher', v)} allowEmpty emptyLabel={tr('All teachers')} options={staff.data ?? []} />
          </div>
        )}
        {day.data && (
          <p className="ml-auto text-sm text-muted-foreground">
            {tr('{count} lessons', { count: lessons.length })}{changed ? ' · ' + tr('{changed} changed', { changed }) : ''}
          </p>
        )}
      </div>
      {!validDate ? (
        <EmptyState title={tr('Pick a date')} />
      ) : day.isPending ? (
        <TableSkeleton rows={6} columns={5} />
      ) : day.isError ? (
        <ErrorState error={day.error} onRetry={() => void day.refetch()} />
      ) : lessons.length === 0 ? (
        <EmptyState title={tr('No lessons on {date}', { date: formatDate(date) })} description={tr('Nothing is timetabled for that day and selection.')} icon={CalendarOff} />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {lessons.map((l) => {
            const covered = l.teacher !== l.regular_teacher
            const off = l.is_cancelled || l.closed_by != null
            return (
              <li key={`${l.entry}-${l.date}`} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5', off && 'bg-muted/30')}>
                <span className="w-24 text-sm tabular-nums text-muted-foreground">
                  {hhmm(l.start_time)}–{hhmm(l.end_time)}
                </span>
                <div className={cn('min-w-0 flex-1', off && 'text-muted-foreground line-through decoration-1')}>
                  <p className="font-medium">
                    {l.subject_name} <span className="font-normal text-muted-foreground">· {l.section_name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {l.teacher_name}
                    {l.room_name ? ` · ${l.room_name}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {l.closed_by && (
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-muted-foreground">
                      <CalendarOff className="h-3 w-3" aria-hidden /> {l.closed_by}
                    </span>
                  )}
                  {l.is_cancelled && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-danger/20 bg-danger-soft px-2 py-0.5 text-danger">
                      <Ban className="h-3 w-3" aria-hidden /> {tr('Cancelled')}
                    </span>
                  )}
                  {covered && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-info/20 bg-info-soft px-2 py-0.5 text-info">
                      <UserRoundCog className="h-3 w-3" aria-hidden /> {tr('Covered')}
                    </span>
                  )}
                  {l.note && <span className="text-muted-foreground">“{l.note}”</span>}
                </div>
                {manage && !l.closed_by && (
                  <Button size="sm" variant="ghost" onClick={() => setChanging(l)} aria-label={tr('Change {subject_name} for {section_name}', { subject_name: l.subject_name, section_name: l.section_name })}>
                    <Pencil aria-hidden /> {l.change ? tr('Edit change') : tr('Change')}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <LessonChangeDialog lesson={changing} campus={changing ? (campusOf(changing) ?? null) : null} onClose={() => setChanging(null)} />
    </>
  )
}
