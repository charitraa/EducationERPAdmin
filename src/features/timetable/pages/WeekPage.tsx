import { Coffee, Plus, Sparkles } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAcademicYearOptions, useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { useRoomOptions } from '@/features/academics/rooms/hooks/useRooms'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { usePermissions } from '@/hooks/usePermissions'
import { todayIso } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import { DEFAULT_DAYS, hhmm, WEEKDAYS, type Entry, type Period } from '../api/timetable.api'
import { EntryDialog, type EntrySlot } from '../components/EntryDialog'
import { GenerateDialog } from '../components/GenerateDialog'
import { useScheduleOptions, useSchedulePeriods, useWeek } from '../hooks/useTimetable'
import { tr } from '@/lib/i18n'

type By = 'class' | 'teacher' | 'room'
const BY: Array<{ value: By; label: string }> = [
  { value: 'class', label: tr('Class') },
  { value: 'teacher', label: tr('Teacher') },
  { value: 'room', label: tr('Room') },
]

/** What a lesson cell shows depends on the view: the class view names the teacher, the teacher view the class. */
function LessonCard({ e, by, onClick }: { e: Entry; by: By; onClick?: () => void }) {
  const secondary = by === 'class' ? e.teacher_name : e.section_name
  const body = (
    <>
      <span className="block truncate font-medium">{e.subject_name}</span>
      <span className="block truncate text-[11px] text-muted-foreground">{secondary}</span>
      {by !== 'room' && e.room_name && <span className="block truncate text-[11px] text-muted-foreground">{e.room_name}</span>}
      {e.combined_group && <span className="block text-[10px] uppercase tracking-wide text-info">{tr('Combined')}</span>}
    </>
  )
  const cls = 'block w-full rounded-md border border-primary/20 bg-accent/50 px-2 py-1.5 text-left text-xs'
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'hover:border-primary/50 hover:bg-accent')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export default function WeekPage() {
  const [params, setParams] = useSearchParams()
  const by = (BY.find((b) => b.value === params.get('by'))?.value ?? 'class') as By
  const target = params.get('id') ?? ''
  const { can } = usePermissions()
  const manage = can(PERMS.timetable.manage)
  const { selectedBranchId, defaultBranchId } = useBranches()
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const yearId = current.data?.id ?? years.data?.[0]?.id
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: yearId, campus: selectedBranchId ?? undefined, ordering: 'level' }, { enabled: yearId != null })
  const staff = useStaffOptions()
  const section = classes.data?.results.find((c) => String(c.id) === target)
  const campus = by === 'class' ? (section?.campus ?? null) : (selectedBranchId ?? defaultBranchId)
  const rooms = useRoomOptions(campus)
  const schedules = useScheduleOptions(campus)
  const scheduleId = params.get('schedule') ?? (schedules.data?.[0] ? String(schedules.data[0].id) : '')
  const schedule = schedules.data?.find((s) => String(s.id) === scheduleId) ?? null
  const periods = useSchedulePeriods(schedule?.id)
  const week = useWeek({ [by === 'class' ? 'section' : by]: target || undefined }, Boolean(target))
  const [slot, setSlot] = useState<EntrySlot | null>(null)
  const ids = { target: useId(), schedule: useId() }
  const [generating, setGenerating] = useState(false)

  const set = (changes: Record<string, string | undefined>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: true },
    )

  // Days: the usual school week, plus any other day that has lessons.
  const days = useMemo(() => {
    const used = new Set((week.data ?? []).map((e) => e.day_of_week as number))
    return WEEKDAYS.filter((d) => DEFAULT_DAYS.includes(d.value) || used.has(d.value))
  }, [week.data])
  // Periods in effect today: a retime leaves the old times (ending) and the new ones (starting later) side by side.
  const today = todayIso()
  const rows: Period[] = (periods.data ?? []).filter((p) => (!p.valid_from || p.valid_from <= today) && (!p.valid_until || p.valid_until >= today))
  const rowIds = new Set(rows.map((p) => p.id))
  const at = (day: number, period: number) => (week.data ?? []).filter((e) => e.day_of_week === day && e.period === period)
  // A teacher or room can have lessons in another shift's bell schedule: listed under the grid.
  const elsewhere = (week.data ?? []).filter((e) => e.period == null || !rowIds.has(e.period))
  const canEdit = manage && by === 'class' && section != null

  const targetPicker =
    by === 'class' ? (
      <SelectControl id={ids.target} value={target} onChange={(v) => set({ id: v })} loading={classes.isPending} placeholder={tr('Choose a class')} options={(classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.display_name }))} />
    ) : by === 'teacher' ? (
      <SelectControl id={ids.target} value={target} onChange={(v) => set({ id: v })} loading={staff.isPending} placeholder={tr('Choose a teacher')} options={staff.data ?? []} />
    ) : (
      <SelectControl id={ids.target} value={target} onChange={(v) => set({ id: v })} loading={rooms.isPending} placeholder={tr('Choose a room')} options={rooms.data ?? []} />
    )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">{tr('Show the week of a')}</span>
          <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label={tr('Show the week of a')}>
            {BY.map((b) => (
              <button
                key={b.value}
                type="button"
                role="radio"
                aria-checked={by === b.value}
                onClick={() => set({ by: b.value === 'class' ? undefined : b.value, id: undefined })}
                className={cn('rounded px-3 py-1 text-sm', by === b.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid min-w-52 gap-1.5">
          <Label htmlFor={ids.target}>{BY.find((b) => b.value === by)!.label}</Label>
          {targetPicker}
        </div>
        {(schedules.data?.length ?? 0) > 1 && (
          <div className="grid min-w-44 gap-1.5">
            <Label htmlFor={ids.schedule}>{tr('Bell schedule')}</Label>
            <SelectControl id={ids.schedule} value={scheduleId} onChange={(v) => set({ schedule: v })} options={(schedules.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))} />
          </div>
        )}
        {manage && schedule && (
          <Button variant="outline" className="ml-auto" onClick={() => setGenerating(true)}>
            <Sparkles aria-hidden /> {tr('Generate')}
          </Button>
        )}
      </div>

      {schedules.data?.length === 0 ? (
        <EmptyState title={tr('No bell schedule')} description={tr('Set up the periods of the day under Bell schedules first.')} />
      ) : !target ? (
        <EmptyState title={by === 'class' ? tr('Choose a class') : by === 'teacher' ? tr('Choose a teacher') : tr('Choose a room')} description={by === 'class' ? tr('See and edit its week. Click an empty slot to add a lesson.') : tr('See their week, across all classes.')} />
      ) : periods.isPending || week.isPending ? (
        <TableSkeleton rows={6} columns={6} />
      ) : week.isError ? (
        <ErrorState error={week.error} onRetry={() => void week.refetch()} />
      ) : (
        <>
          {/* Desktop: the grid */}
          <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
            <table className="w-full table-fixed text-sm" aria-label={tr('Weekly timetable')}>
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-28 px-2 py-2 text-left font-medium">
                    {tr('Period')}
                  </th>
                  {days.map((d) => (
                    <th key={d.value} scope="col" className="px-2 py-2 text-left font-medium">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((p) =>
                  p.is_break ? (
                    <tr key={p.id} className="bg-muted/30">
                      <th scope="row" className="px-2 py-1 text-left text-xs font-normal text-muted-foreground">
                        {hhmm(p.start_time)}
                      </th>
                      <td colSpan={days.length} className="px-2 py-1 text-xs text-muted-foreground">
                        <Coffee className="mr-1 inline h-3 w-3" aria-hidden /> {p.name}
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id}>
                      <th scope="row" className="px-2 py-1.5 text-left align-top font-normal">
                        <span className="block text-xs font-medium">{p.name}</span>
                        <span className="block text-[11px] tabular-nums text-muted-foreground">
                          {hhmm(p.start_time)}–{hhmm(p.end_time)}
                        </span>
                      </th>
                      {days.map((d) => {
                        const lessons = at(d.value, p.id)
                        return (
                          <td key={d.value} className="h-16 px-1 py-1 align-top">
                            <div className="grid gap-1">
                              {lessons.map((e) => (
                                <LessonCard key={e.id} e={e} by={by} onClick={canEdit ? () => setSlot({ entry: e, section: section!.id, campus: section!.campus, day: d.value, period: p }) : undefined} />
                              ))}
                              {canEdit && lessons.length === 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSlot({ entry: null, section: section.id, campus: section.campus, day: d.value, period: p })}
                                  className="flex h-12 items-center justify-center rounded-md border border-dashed text-muted-foreground opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
                                  aria-label={tr('Add a lesson on {label}, {name}', { label: d.label, name: p.name })}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {/* Phone: one day after another */}
          <div className="grid gap-3 md:hidden">
            {days.map((d) => {
              const lessons = (week.data ?? []).filter((e) => e.day_of_week === d.value).sort((a, b) => a.start_time.localeCompare(b.start_time))
              return (
                <section key={d.value} className="rounded-lg border bg-card">
                  <h3 className="border-b px-3 py-2 text-sm font-semibold">{d.label}</h3>
                  {lessons.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">{tr('No lessons.')}</p>
                  ) : (
                    <ul className="divide-y">
                      {lessons.map((e) => (
                        <li key={e.id} className="flex gap-3 px-3 py-2 text-sm">
                          <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{hhmm(e.start_time)}</span>
                          <span className="min-w-0">
                            <span className="block font-medium">{e.subject_name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {[by === 'class' ? e.teacher_name : e.section_name, by !== 'room' ? e.room_name : null].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>

          {elsewhere.length > 0 && (
            <section className="mt-4 rounded-lg border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">{tr('In other bell schedules')}</h3>
              <ul className="grid gap-1 text-sm">
                {elsewhere.map((e) => (
                  <li key={e.id}>
                    {e.day_name} {hhmm(e.start_time)}–{hhmm(e.end_time)}: {e.subject_name} · {by === 'class' ? e.teacher_name : e.section_name}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {week.data?.length === 0 && canEdit && <p className="mt-3 text-sm text-muted-foreground">{tr('No lessons yet. Click a slot to add one, or use Generate.')}</p>}
        </>
      )}

      <EntryDialog slot={slot} periods={rows} onClose={() => setSlot(null)} />
      <GenerateDialog open={generating} onOpenChange={setGenerating} schedule={schedule} academicYear={yearId} preselect={by === 'class' && section ? section.id : null} />
    </>
  )
}
