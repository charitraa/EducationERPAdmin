import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Money } from '@/features/finance/components/money'
import { useMyBalances, useMyLeave } from '@/features/hr/hooks/useHr'
import { days } from '@/features/hr/pages/LeavePages'
import { hhmm, type Lesson } from '@/features/timetable/api/timetable.api'
import { formatDate, formatDateTime, todayIso } from '@/lib/dates'
import { pluralize } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Id } from '@/shared/types/api'
import { rememberSubject, useAlumniEvents, useMyExams, useMyMentorships, useMyPayslips, useMyStatement, useMyStudentAttendance, useMyTimetable, useWho } from '../hooks/useSelf'

/** One line of the summary: a label, a figure, and where it leads. */
function Line({ label, to, onClick, loading, children }: { label: string; to: string; onClick?: () => void; loading?: boolean; children: ReactNode }) {
  return (
    <li>
      <Link to={to} onClick={onClick} className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-muted/60">
        <span className="shrink-0 text-muted-foreground">{label}</span>
        {loading ? <Skeleton className="ml-auto h-4 w-16" /> : <span className="min-w-0 flex-1 text-right font-medium">{children}</span>}
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  )
}

function Lessons({ lessons, teacher }: { lessons: Lesson[]; teacher: boolean }) {
  const live = lessons.filter((l) => !l.is_cancelled).sort((a, b) => a.start_time.localeCompare(b.start_time))
  if (live.length === 0) return <>No lessons</>
  const first = live[0]
  return (
    <>
      {pluralize(live.length, 'lesson')} <span className="font-normal text-muted-foreground">· first {hhmm(first.start_time)} {first.subject_name}{teacher ? `, ${first.section_name}` : ''}</span>
    </>
  )
}

function Card({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-4 py-3 font-semibold">{title}</h2>
      <ul className="p-1.5">{children}</ul>
    </section>
  )
}

function StudentCard({ child, name, subjectKey }: { child: Id | null; name: string; subjectKey: string }) {
  const p = child != null ? { student: child } : {}
  const today = todayIso()
  const tt = useMyTimetable({ as: child != null ? 'parent' : 'student', ...p, date: today })
  const att = useMyStudentAttendance(p)
  const fees = useMyStatement(p)
  const exams = useMyExams(p)
  const pick = () => rememberSubject(subjectKey)
  const next = (exams.data ?? [])
    .flatMap((e) => e.papers.map((paper) => ({ ...paper, exam: e.name })))
    .filter((x) => x.date != null && x.date >= today)
    .sort((a, b) => (a.date! + (a.start_time ?? '')).localeCompare(b.date! + (b.start_time ?? '')))[0]
  const pctValue = att.data?.summary.overall.percentage
  return (
    <Card title={child != null ? name : 'My day'}>
      <Line label="Today" to="/me/timetable" onClick={pick} loading={tt.isPending}>
        {tt.isError ? '—' : <Lessons lessons={(tt.data?.lessons ?? []) as Lesson[]} teacher={false} />}
      </Line>
      <Line label="Attendance, last 30 days" to="/me/attendance" onClick={pick} loading={att.isPending}>
        <span className={cn(pctValue != null && pctValue < 75 && 'text-danger')}>{pctValue == null ? '—' : `${Math.round(pctValue)}%`}</span>
      </Line>
      <Line label="Fees owed" to="/me/fees" onClick={pick} loading={fees.isPending}>
        {fees.data ? <Money value={fees.data.balance} tone="none" className={cn(fees.data.balance > 0 && 'text-danger')} /> : '—'}
      </Line>
      <Line label="Next exam paper" to="/me/exams" onClick={pick} loading={exams.isPending}>
        {next ? (
          <>
            {next.subject_name} <span className="font-normal text-muted-foreground">· {formatDate(next.date)}</span>
          </>
        ) : (
          'None scheduled'
        )}
      </Line>
    </Card>
  )
}

function StaffCard() {
  const tt = useMyTimetable({ as: 'teacher', date: todayIso() })
  const balances = useMyBalances()
  const leave = useMyLeave()
  const slips = useMyPayslips()
  const pick = () => rememberSubject('staff')
  // Days of different types don't add up; name the first two.
  const rows = balances.data ?? []
  const left = rows.slice(0, 2).map((b) => `${b.leave_type_name} ${days(b.available)}`).join(', ') + (rows.length > 2 ? ` +${rows.length - 2} more` : '')
  const pending = (leave.data ?? []).filter((r) => r.status === 'pending').length
  const latest = slips.data?.[0]
  return (
    <Card title="My day">
      <Line label="Today" to="/me/timetable" onClick={pick} loading={tt.isPending}>
        {tt.isError ? '—' : <Lessons lessons={(tt.data?.lessons ?? []) as Lesson[]} teacher />}
      </Line>
      <Line label="Leave left" to="/me/leave" onClick={pick} loading={balances.isPending}>
        {balances.isError || rows.length === 0 ? '—' : left}
        {pending > 0 && <span className="font-normal text-muted-foreground"> · {pending} pending</span>}
      </Line>
      <Line label="Latest payslip" to={latest ? `/me/payslips/${latest.id}` : '/me/payslips'} onClick={pick} loading={slips.isPending}>
        {latest ? (
          <>
            <Money value={latest.net_pay} tone="none" /> <span className="font-normal text-muted-foreground">· {latest.run_name}</span>
          </>
        ) : (
          'None yet'
        )}
      </Line>
    </Card>
  )
}

function AlumniCard({ profileId }: { profileId: Id }) {
  const events = useAlumniEvents(true)
  const mentoring = useMyMentorships()
  const next = events.data?.[0]
  const rows = mentoring.data ?? []
  const asking = rows.filter((m) => m.mentor === profileId && m.status === 'pending').length
  const active = rows.filter((m) => m.status === 'accepted').length
  const RESPONSE = { going: 'going', maybe: 'maybe', declined: 'not going' } as const
  return (
    <Card title="Alumni">
      <Line label="Next event" to="/me/alumni-events" loading={events.isPending}>
        {next ? (
          <>
            {next.title}{' '}
            <span className="font-normal text-muted-foreground">
              · {formatDateTime(next.starts_at)}
              {next.my_response ? ` · ${RESPONSE[next.my_response]}` : ' · not answered'}
            </span>
          </>
        ) : (
          'None coming up'
        )}
      </Line>
      <Line label="Mentoring" to="/me/mentoring" loading={mentoring.isPending}>
        {asking > 0 ? <span className="text-primary">{pluralize(asking, 'request')} to answer</span> : active > 0 ? `${active} in progress` : 'Nothing open'}
      </Line>
    </Card>
  )
}

/**
 * The dashboard's personal part: today's lessons and the figures people
 * check most, for their own records and each of their children's. Shown to
 * anyone linked to a staff, student, parent or graduate record.
 */
export function MySummary() {
  const { staff, student, parent, alumnus, isPending } = useWho()
  if (isPending || (!staff && !student && !parent && !alumnus)) return null
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {staff && <StaffCard />}
      {student && <StudentCard child={null} name={student.full_name} subjectKey="student" />}
      {alumnus && <AlumniCard profileId={alumnus.id} />}
      {parent?.children.map((c) => <StudentCard key={c.student} child={c.student} name={c.full_name} subjectKey={`child-${c.student}`} />)}
    </div>
  )
}
