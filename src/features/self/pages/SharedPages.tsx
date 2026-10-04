import { BedDouble, BookOpen, Bus, CalendarDays, FileStack, MessageSquareWarning, Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { EmptyState } from '@/components/data-display/EmptyState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Money } from '@/features/finance/components/money'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions, pluralize } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Entry, Lesson } from '@/features/timetable/api/timetable.api'
import { hhmm, WEEKDAYS } from '@/features/timetable/api/timetable.api'
import { Block, Figure, Loaded, MiniTable } from '../components/SelfParts'
import {
  useChildParam,
  useMyApplications,
  useMyBeds,
  useMyBoarding,
  useMyComplaints,
  useMyFines,
  useMyLibraryMember,
  useMyLoans,
  useMyReservations,
  useMyRoutes,
  useMyStaffAttendance,
  useMyStudentAttendance,
  useMyTimetable,
  useRaiseComplaint,
  useSubject,
  useWho,
} from '../hooks/useSelf'

// ---------------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------------
function useTimetableParams(date?: string) {
  const s = useSubject()
  const child = useChildParam()
  if (s.kind === 'staff') return { as: 'teacher' as const, date }
  return { as: child.student != null ? ('parent' as const) : ('student' as const), ...child, date }
}

function LessonLine({ l, teacher }: { l: Entry | Lesson; teacher: boolean }) {
  const cancelled = 'is_cancelled' in l && l.is_cancelled
  const covered = 'regular_teacher' in l && l.regular_teacher !== l.teacher
  return (
    <div className={cn('rounded-md border bg-card px-3 py-2 text-sm', cancelled && 'opacity-60')}>
      <p className="text-xs tabular-nums text-muted-foreground">
        {hhmm(l.start_time)}–{hhmm(l.end_time)} · {l.period_name}
      </p>
      <p className={cn('font-medium', cancelled && 'line-through')}>{l.subject_name}</p>
      <p className="text-xs text-muted-foreground">
        {teacher ? l.section_name : l.teacher_name}
        {l.room_name ? ` · ${l.room_name}` : ''}
      </p>
      {cancelled && <p className="text-xs font-medium text-danger">Cancelled{'note' in l && l.note ? `: ${l.note}` : ''}</p>}
      {!cancelled && covered && <p className="text-xs font-medium text-warning-foreground">Cover: {l.teacher_name}</p>}
    </div>
  )
}

/** The week's lessons by day, or one day's with that day's changes. */
export function MyTimetablePage() {
  const [mode, setMode] = useState<'week' | 'day'>('week')
  const [date, setDate] = useState(todayIso())
  const params = useTimetableParams(mode === 'day' ? date : undefined)
  const tt = useMyTimetable(params)
  const teacher = params.as === 'teacher'
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label="Show">
          {(['week', 'day'] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn('rounded px-3 py-1 text-sm', mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {m === 'week' ? 'Week' : 'One day'}
            </button>
          ))}
        </div>
        {mode === 'day' && <DatePicker aria-label="Day" value={date} onChange={(d) => setDate(d || todayIso())} className="w-44" />}
      </div>
      <Loaded query={tt}>
        {(data) => {
          const lessons = [...data.lessons].sort((a, b) => a.start_time.localeCompare(b.start_time))
          if (lessons.length === 0)
            return <EmptyState icon={CalendarDays} title={mode === 'day' ? 'No lessons that day' : 'No timetable yet'} description={mode === 'week' ? 'Lessons appear here once the timetable is set for your class.' : undefined} />
          if (mode === 'day')
            return (
              <div className="grid max-w-md gap-2">
                {lessons.map((l, i) => (
                  <LessonLine key={i} l={l} teacher={teacher} />
                ))}
              </div>
            )
          const days = WEEKDAYS.filter((d) => lessons.some((l) => l.day_of_week === d.value))
          return (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {days.map((d) => (
                <section key={d.value} aria-label={d.label}>
                  <h2 className="mb-2 text-sm font-semibold">{d.label}</h2>
                  <div className="grid gap-2">
                    {lessons
                      .filter((l) => l.day_of_week === d.value)
                      .map((l, i) => (
                        <LessonLine key={i} l={l} teacher={teacher} />
                      ))}
                  </div>
                </section>
              ))}
            </div>
          )
        }}
      </Loaded>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
const monthStart = () => `${todayIso().slice(0, 8)}01`

function Span({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">From</span>
        <DatePicker value={from} onChange={(d) => onChange(d, to)} className="w-44" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">To</span>
        <DatePicker value={to} onChange={(d) => onChange(from, d)} className="w-44" />
      </label>
    </div>
  )
}

const DAY_TONE: Record<string, StatusTone> = { present: 'success', late: 'warning', half_day: 'warning', absent: 'danger', leave: 'muted', on_duty: 'info' }
const MARK_TONE: Record<string, StatusTone> = { present: 'success', late: 'warning', absent: 'danger', excused: 'muted', leave: 'muted', medical_leave: 'muted', on_duty: 'info' }

const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 10) / 10}%`)
const worked = (m: number | null | undefined) => (m == null ? '—' : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`)
const time = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')

function StaffAttendance() {
  const [span, setSpan] = useState({ from: monthStart(), to: todayIso() })
  const q = useMyStaffAttendance(span)
  return (
    <div className="grid gap-4">
      <Span from={span.from} to={span.to} onChange={(from, to) => setSpan({ from, to })} />
      <Loaded query={q}>
        {({ summary, days }) => (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Figure label="Working days" value={summary.working_days} />
              <Figure label="Present" value={summary.present} />
              <Figure label="Late" value={summary.late} />
              <Figure label="Absent" value={summary.absent} />
              <Figure label="On leave" value={summary.leave} />
              <Figure label="Average day" value={worked(summary.average_worked_minutes)} />
            </div>
            <MiniTable
              label="My days"
              rows={days}
              rowKey={(d) => d.id}
              empty={{ title: 'No days recorded', description: 'Days appear once you check in, or the office records them.' }}
              columns={[
                { header: 'Date', cell: (d) => formatDate(d.date) },
                { header: 'Status', cell: (d) => <StatusBadge status={d.status} tone={DAY_TONE[d.status]} label={enumLabel('StaffDayStatusEnum', d.status)} /> },
                { header: 'In', cell: (d) => time(d.first_in), className: 'tabular-nums' },
                { header: 'Out', cell: (d) => time(d.last_out), className: 'tabular-nums' },
                { header: 'Worked', cell: (d) => worked(d.worked_minutes), className: 'tabular-nums' },
                { header: 'Note', cell: (d) => d.note || (d.is_override ? 'Set by the office' : '') },
              ]}
            />
          </>
        )}
      </Loaded>
    </div>
  )
}

function StudentAttendance() {
  const child = useChildParam()
  const [span, setSpan] = useState({ from: monthStart(), to: todayIso() })
  const q = useMyStudentAttendance({ ...child, ...span })
  return (
    <div className="grid gap-4">
      <Span from={span.from} to={span.to} onChange={(from, to) => setSpan({ from, to })} />
      <Loaded query={q}>
        {({ summary, records }) => (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Attended" value={pct(summary.overall.percentage)} hint={`${summary.overall.attended} of ${summary.overall.total} sessions${summary.overall.excused + summary.overall.leave + summary.overall.medical_leave > 0 ? '; leave isn’t counted' : ''}`} />
              <Figure label="Absent" value={summary.overall.absent} />
              <Figure label="Late" value={summary.overall.late} />
              <Figure label="Leave" value={summary.overall.leave + summary.overall.medical_leave} />
            </div>
            {summary.subjects.length > 0 && (
              <Block title="By subject">
                <MiniTable
                  label="Attendance by subject"
                  rows={summary.subjects}
                  rowKey={(s) => s.subject}
                  empty={{ title: '' }}
                  columns={[
                    { header: 'Subject', cell: (s) => s.subject_name },
                    { header: 'Attended', cell: (s) => `${pct(s.percentage)} (${s.attended}/${s.total})`, className: 'tabular-nums' },
                    { header: 'Absent', cell: (s) => s.absent, className: 'tabular-nums' },
                    { header: 'Late', cell: (s) => s.late, className: 'tabular-nums' },
                  ]}
                />
              </Block>
            )}
            <Block title="Day by day">
              <MiniTable
                label="Attendance records"
                rows={records}
                rowKey={(r) => r.id}
                empty={{ title: 'Nothing recorded in these dates' }}
                columns={[
                  { header: 'Date', cell: (r) => formatDate(r.date) },
                  { header: 'Class', cell: (r) => r.subject_name ?? 'Daily roll call' },
                  { header: 'Status', cell: (r) => <StatusBadge status={r.status} tone={MARK_TONE[r.status]} label={enumLabel('AttendanceStatusEnum', r.status)} /> },
                  { header: 'Note', cell: (r) => r.note },
                ]}
              />
            </Block>
          </>
        )}
      </Loaded>
    </div>
  )
}

export function MyAttendancePage() {
  return useSubject().kind === 'staff' ? <StaffAttendance /> : <StudentAttendance />
}

// ---------------------------------------------------------------------------
// Transport, hostel, library: one list covers the person and their children
// ---------------------------------------------------------------------------
/** A parent sees every child's rows from these endpoints; keep the chosen child's. */
function useRiderFilter() {
  const s = useSubject()
  const { staff, student } = useWho()
  return (row: { student: number | null; staff: number | null }) => {
    if (s.kind === 'staff') return row.staff != null && row.staff === staff?.id
    if (s.kind === 'student') return row.student != null && row.student === (s.child ?? student?.id)
    return true
  }
}

export function MyTransportPage() {
  const routes = useMyRoutes()
  const boarding = useMyBoarding()
  const mine = useRiderFilter()
  return (
    <div className="grid gap-6">
      <Block title="Route">
        <Loaded query={routes}>
          {(rows) => (
            <MiniTable
              label="Routes"
              rows={rows.filter(mine)}
              rowKey={(r) => r.id}
              empty={{ title: 'Not on a route', icon: Bus, description: 'The transport office assigns a route and stop.' }}
              columns={[
                { header: 'Route', cell: (r) => r.route_name },
                { header: 'Stop', cell: (r) => r.stop_name },
                { header: 'Pickup', cell: (r) => hhmm(r.pickup_time) || '—', className: 'tabular-nums' },
                { header: 'Drop', cell: (r) => hhmm(r.drop_time) || '—', className: 'tabular-nums' },
                { header: 'Direction', cell: (r) => enumLabel('RideDirectionEnum', r.direction) },
                { header: 'From', cell: (r) => `${formatDate(r.start_date)}${r.end_date ? ` – ${formatDate(r.end_date)}` : ''}` },
              ]}
            />
          )}
        </Loaded>
      </Block>
      <Block title="Boarding" description="Each trip, as the crew marked it.">
        <Loaded query={boarding}>
          {(rows) => (
            <MiniTable
              label="Boarding history"
              rows={rows.filter(mine)}
              rowKey={(r) => r.id}
              empty={{ title: 'No trips yet' }}
              columns={[
                { header: 'Date', cell: (r) => formatDate(r.date) },
                { header: 'Trip', cell: (r) => `${r.route_name} · ${enumLabel('TripDirectionEnum', r.direction)}` },
                { header: 'Stop', cell: (r) => r.stop_name },
                { header: 'Status', cell: (r) => <StatusBadge status={r.status} tone={r.status === 'boarded' ? 'success' : 'danger'} label={enumLabel('BoardingStatusEnum', r.status)} /> },
                { header: 'At', cell: (r) => (r.at ? formatDateTime(r.at) : '—') },
              ]}
            />
          )}
        </Loaded>
      </Block>
    </div>
  )
}

const complaintSchema = z.object({ category: z.string(), title: z.string().trim().min(1, 'Say what’s wrong.').max(200), description: z.string() })

export function MyHostelPage() {
  const beds = useMyBeds()
  const complaints = useMyComplaints()
  const raise = useRaiseComplaint()
  const mine = useRiderFilter()
  const s = useSubject()
  const [raising, setRaising] = useState(false)
  // Complaints are the account holder's own: a parent viewing a child doesn't raise them.
  const own = s.kind === 'staff' || (s.kind === 'student' && s.child == null)
  const checkedIn = (beds.data ?? []).some((b) => mine(b) && b.status === 'checked_in')
  return (
    <div className="grid gap-6">
      <Block title="Bed">
        <Loaded query={beds}>
          {(rows) => (
            <MiniTable
              label="Hostel stays"
              rows={rows.filter(mine)}
              rowKey={(r) => r.id}
              empty={{ title: 'No hostel bed', icon: BedDouble }}
              columns={[
                { header: 'Bed', cell: (r) => `${r.building_name} · Room ${r.room_number} · ${r.bed_label}` },
                { header: 'Status', cell: (r) => <StatusBadge status={r.status} label={enumLabel('AllocationStatusEnum', r.status)} /> },
                { header: 'From', cell: (r) => formatDate(r.start_date) },
                { header: 'Until', cell: (r) => formatDate(r.end_date) },
              ]}
            />
          )}
        </Loaded>
      </Block>
      {own && (
        <Block
          title="Complaints"
          description="Something wrong with your room: repairs, cleaning, food, security."
          action={
            checkedIn ? (
              <Button size="sm" onClick={() => setRaising(true)}>
                <Plus aria-hidden /> Raise a complaint
              </Button>
            ) : undefined
          }
        >
          <Loaded query={complaints}>
            {(rows) => (
              <MiniTable
                label="My complaints"
                rows={rows}
                rowKey={(r) => r.id}
                empty={{ title: 'No complaints', icon: MessageSquareWarning }}
                columns={[
                  { header: 'Complaint', cell: (r) => r.title },
                  { header: 'Category', cell: (r) => enumLabel('ComplaintCategoryEnum', r.category) },
                  { header: 'Status', cell: (r) => <StatusBadge status={r.status} label={enumLabel('ComplaintStatusEnum', r.status)} /> },
                  { header: 'Raised', cell: (r) => formatDate(r.created_at) },
                  { header: 'Resolution', cell: (r) => r.resolution || (r.assigned_to_name ? `With ${r.assigned_to_name}` : '') },
                ]}
              />
            )}
          </Loaded>
        </Block>
      )}
      <FormDialog
        open={raising}
        onOpenChange={setRaising}
        title="Raise a complaint"
        description="The hostel office sees it straight away."
        submitLabel="Raise"
        schema={complaintSchema}
        defaultValues={{ category: 'maintenance', title: '', description: '' }}
        onSubmit={async (v) => {
          await raise.mutateAsync(v)
          toast.success('Complaint raised.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label="Category">
              {(p) => <Controller control={control} name="category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ComplaintCategoryEnum')} />} />}
            </FormField>
            <FormField label="What’s wrong" required error={errors.title?.message}>
              {(p) => <Input {...p} {...register('title')} placeholder="The fan in my room doesn’t work" />}
            </FormField>
            <FormField label="Details">{(p) => <Textarea {...p} {...register('description')} rows={3} />}</FormField>
          </>
        )}
      </FormDialog>
    </div>
  )
}

export function MyLibraryPage() {
  const member = useMyLibraryMember()
  const has = member.data != null
  const loans = useMyLoans(has)
  const reservations = useMyReservations(has)
  const fines = useMyFines(has)
  return (
    <Loaded query={member}>
      {(m) =>
        m == null ? (
          <EmptyState icon={BookOpen} title="No library membership" description="Ask the library desk to make you a member." />
        ) : (
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Member number" value={<span className="font-mono text-base">{m.member_number}</span>} hint={m.campus_name} />
              <Figure label="Borrowed now" value={m.active_issues} hint={m.max_books ? `of ${m.max_books} allowed` : undefined} />
              <Figure label="Loan period" value={m.loan_period_days ? pluralize(m.loan_period_days, 'day') : '—'} />
              <Figure label="Unpaid fines" value={<Money value={(fines.data ?? []).filter((f) => f.status === 'pending').reduce((t, f) => t + Number(f.amount), 0)} tone="none" />} />
            </div>
            <Block title="Books">
              <Loaded query={loans}>
                {(rows) => (
                  <MiniTable
                    label="My loans"
                    rows={rows}
                    rowKey={(r) => r.id}
                    empty={{ title: 'Nothing borrowed yet' }}
                    columns={[
                      { header: 'Book', cell: (r) => r.book_title },
                      { header: 'Borrowed', cell: (r) => formatDate(r.issued_at) },
                      { header: 'Due', cell: (r) => <span className={cn(r.is_overdue && !r.returned_at && 'font-medium text-danger')}>{formatDate(r.due_at)}</span> },
                      { header: 'Returned', cell: (r) => (r.returned_at ? formatDate(r.returned_at) : r.status === 'lost' ? 'Lost' : '—') },
                    ]}
                  />
                )}
              </Loaded>
            </Block>
            <Block title="Reservations">
              <Loaded query={reservations}>
                {(rows) => (
                  <MiniTable
                    label="My reservations"
                    rows={rows}
                    rowKey={(r) => r.id}
                    empty={{ title: 'No reservations' }}
                    columns={[
                      { header: 'Book', cell: (r) => r.book_title },
                      { header: 'Status', cell: (r) => <StatusBadge status={r.status} label={enumLabel('ReservationStatusEnum', r.status)} /> },
                      { header: 'Reserved', cell: (r) => formatDate(r.reserved_at) },
                      { header: 'Collect by', cell: (r) => (r.status === 'ready' ? formatDate(r.expires_at) : '—') },
                    ]}
                  />
                )}
              </Loaded>
            </Block>
            <Block title="Fines">
              <Loaded query={fines}>
                {(rows) => (
                  <MiniTable
                    label="My fines"
                    rows={rows}
                    rowKey={(r) => r.id}
                    empty={{ title: 'No fines' }}
                    columns={[
                      { header: 'For', cell: (r) => r.book_title ?? enumLabel('FineCategoryEnum', r.category) },
                      { header: 'Amount', cell: (r) => <Money value={r.amount} tone="none" />, className: 'text-right' },
                      { header: 'Status', cell: (r) => <StatusBadge status={r.status} label={enumLabel('FineStatusEnum', r.status)} /> },
                      { header: 'Date', cell: (r) => formatDate(r.created_at) },
                    ]}
                  />
                )}
              </Loaded>
            </Block>
          </div>
        )
      }
    </Loaded>
  )
}

/** Applications I sent, or that are about me or my children; each opens in Applications. */
export function MyApplicationsPage() {
  const q = useMyApplications()
  return (
    <Block
      title="Applications"
      description="Requests you sent, and ones about you or your children."
      action={
        <Button size="sm" asChild>
          <Link to="/applications/mine">
            <Plus aria-hidden /> New application
          </Link>
        </Button>
      }
    >
      <Loaded query={q}>
        {(rows) => (
          <MiniTable
            label="My applications"
            rows={rows}
            rowKey={(r) => r.id}
            empty={{ title: 'No applications', icon: FileStack, description: 'Leave notes, certificates, transfers and the like.' }}
            columns={[
              {
                header: 'Application',
                cell: (r) => (
                  <Link to={`/applications/${r.id}`} className="font-medium text-primary hover:underline">
                    {r.type_name} <span className="font-mono text-xs text-muted-foreground">{r.number}</span>
                  </Link>
                ),
              },
              { header: 'About', cell: (r) => r.subject_name || r.contact_name },
              { header: 'Status', cell: (r) => <StatusBadge status={r.status} label={enumLabel('ApplicationStatusEnum', r.status)} /> },
              { header: 'Step', cell: (r) => r.step_name ?? '—' },
              { header: 'Sent', cell: (r) => formatDate(r.submitted_at ?? r.created_at) },
            ]}
          />
        )}
      </Loaded>
    </Block>
  )
}

