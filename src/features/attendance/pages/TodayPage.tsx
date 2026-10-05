import { CalendarCheck, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { SectionHeader } from '@/components/common/SectionHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDate, parseIsoDate, todayIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { isStatus } from '@/shared/api/errors'
import { PERMS } from '@/shared/constants/permissions'
import { hhmm } from '@/features/timetable/api/timetable.api'
import type { MissingItem, MyClass } from '../api/attendance.api'
import { useMissing, useMyClasses, useOpenSession } from '../hooks/useAttendance'
import { tr } from '@/lib/i18n'

type Takeable = Pick<MyClass, 'kind' | 'section' | 'timetable_entry' | 'session'>
const keyOf = (c: Takeable) => (c.kind === 'lesson' ? `l${c.timetable_entry}` : `d${c.section}`)

/** Opens the session if needed (the backend returns the open one if it exists), then goes to the roll call. */
function useTake(date: string) {
  const navigate = useNavigate()
  const open = useOpenSession()
  const [opening, setOpening] = useState<string | null>(null)
  const take = async (c: Takeable) => {
    if (c.session != null) return navigate(`/attendance/sessions/${c.session}`)
    setOpening(keyOf(c))
    try {
      const s = await open.mutateAsync(c.kind === 'lesson' ? { date, timetable_entry: c.timetable_entry! } : { date, section: c.section })
      navigate(`/attendance/sessions/${s.id}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setOpening(null)
    }
  }
  return { take, opening }
}

function What({ c }: { c: { kind: string; subject_name: string | null; section_name: string; start_time: string | null; end_time?: string | null } }) {
  return (
    <>
      <span className="w-24 shrink-0 text-sm tabular-nums text-muted-foreground">{c.start_time ? `${hhmm(c.start_time)}${c.end_time ? `–${hhmm(c.end_time)}` : ''}` : tr('Daily')}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {c.kind === 'lesson' ? c.subject_name : tr('Roll call')} <span className="font-normal text-muted-foreground">· {c.section_name}</span>
        </p>
      </div>
    </>
  )
}

function sessionBadge(status: 'open' | 'submitted' | null, hasSession: boolean) {
  if (status === 'submitted') return <StatusBadge status="submitted" label={tr('Submitted')} />
  if (hasSession) return <StatusBadge status="in_progress" label={tr('In progress')} />
  return <StatusBadge status="pending" label={tr('Not taken')} />
}

function TakeButton({ c, take, opening, children }: { c: Takeable; take: (c: Takeable) => void; opening: string | null; children: ReactNode }) {
  const busy = opening === keyOf(c)
  return (
    <Button size="sm" variant={c.session ? 'outline' : 'default'} onClick={() => take(c)} disabled={opening != null}>
      {busy && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  )
}

function MyClasses({ date }: { date: string }) {
  const mine = useMyClasses(date)
  const { take, opening } = useTake(date)
  if (mine.isPending) return <TableSkeleton rows={3} columns={3} />
  // No staff profile: nothing to take personally. Office users still see the list below.
  if (mine.isError && isStatus(mine.error, 404)) return <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('Your account has no staff profile, so no classes are assigned to you.')}</p>
  if (mine.isError) return <ErrorState error={mine.error} onRetry={() => void mine.refetch()} />
  const classes = [...mine.data.classes].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
  if (classes.length === 0) return <EmptyState title={tr('No classes for you on this day')} description={tr('Lessons you teach (after cover) and classes you’re class teacher of appear here.')} icon={CalendarCheck} />
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {classes.map((c) => (
        <li key={keyOf(c)} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <What c={c} />
          {sessionBadge(c.status, c.session != null)}
          <TakeButton c={c} take={take} opening={opening}>
            {c.status === 'submitted' ? tr('View') : c.session ? tr('Continue') : tr('Take attendance')}
          </TakeButton>
        </li>
      ))}
    </ul>
  )
}

function Missing({ date, canTake }: { date: string; canTake: boolean }) {
  const { selectedBranchId } = useBranches()
  const missing = useMissing({ date, campus: selectedBranchId ?? undefined })
  const { take, opening } = useTake(date)
  if (missing.isPending) return <TableSkeleton rows={4} columns={4} />
  if (missing.isError) return <ErrorState error={missing.error} onRetry={() => void missing.refetch()} />
  const rows = [...missing.data.missing].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '') || a.section_name.localeCompare(b.section_name))
  if (rows.length === 0) return <EmptyState title={tr('Everything is submitted')} description={tr('Every class and lesson that ran on {date} has its attendance in.', { date: formatDate(date) })} icon={CheckCircle2} />
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {rows.map((m: MissingItem) => (
        <li key={keyOf(m)} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <What c={m} />
          <span className="text-sm text-muted-foreground">{m.teacher_name ?? tr('No class teacher')}</span>
          {sessionBadge(null, m.session != null)}
          {canTake && (
            <TakeButton c={m} take={take} opening={opening}>
              {m.session ? tr('Continue') : tr('Take')}
            </TakeButton>
          )}
        </li>
      ))}
    </ul>
  )
}

/** A teacher's classes for the day, and for the office, what's still not submitted. */
export default function TodayPage() {
  const [params, setParams] = useSearchParams()
  const date = params.get('date') ?? todayIso()
  const valid = parseIsoDate(date) != null
  const dateId = useId()
  const { can } = usePermissions()
  const canMark = can(PERMS.attendance.mark)
  const canView = can(PERMS.attendance.view)

  return (
    <>
      <div className="mb-5 grid max-w-48 gap-1.5">
        <Label htmlFor={dateId}>{tr('Date (AD)')}</Label>
        <DatePicker
          id={dateId}
          value={date}
          onChange={(v) =>
            setParams(
              (prev) => {
                const next = new URLSearchParams(prev)
                if (v && v !== todayIso()) next.set('date', v)
                else next.delete('date')
                return next
              },
              { replace: true },
            )
          }
        />
      </div>
      {!valid ? (
        <EmptyState title={tr('Pick a date')} />
      ) : (
        <div className="grid gap-8">
          {canMark && (
            <section>
              <SectionHeader title={tr('My classes')} description={tr('Open a class to mark it; you can save and come back before submitting.')} />
              <MyClasses date={date} />
            </section>
          )}
          {canView && (
            <section>
              <SectionHeader title={tr('Not submitted yet')} description={tr('Every lesson that ran and every daily roll call still missing for the day.')} />
              <Missing date={date} canTake={canMark} />
            </section>
          )}
          {!canMark && !canView && <EmptyState title={tr('Nothing to show')} icon={ClipboardList} />}
        </div>
      )}
    </>
  )
}
