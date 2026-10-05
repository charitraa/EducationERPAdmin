import { ArrowRightLeft, CalendarClock, GraduationCap, LogOut, Pause, Pencil, Play, School } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { BsDateDisplay } from '@/components/forms/BsDateDisplay'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkflowActions, type WorkflowAction } from '@/components/workflow/WorkflowActions'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDate } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import { StudentParentsPanel } from '@/features/parents/components/StudentParentsPanel'
import { currentEnrollment, isEnrolled, type Student, type StudentStatus } from '../api/students.api'
import { EnrollmentHistory, isUpcoming } from '../components/EnrollmentHistory'
import { PlaceStudentDialog } from '../components/PlaceStudentDialog'
import { STATUS_CHANGES, StatusChangeDialog } from '../components/StatusChangeDialog'
import { TransferStudentDialog } from '../components/TransferStudentDialog'
import { useStudent, useStudentEnrollments } from '../hooks/useStudents'
import { tr, trc } from '@/lib/i18n'

const STATUS_ICONS: Record<StudentStatus, typeof Pause> = { suspended: Pause, active: Play, graduated: GraduationCap, withdrawn: LogOut }
const TABS = ['overview', 'history'] as const

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** The one thing to do next, if any: unplaced students, and moves scheduled ahead. */
function Attention({ student, onPlace }: { student: Student; onPlace: () => void }) {
  const history = useStudentEnrollments(student.id)
  const { can } = usePermissions()
  const upcoming = history.data?.find(isUpcoming)
  const enrollment = currentEnrollment(student)

  if (upcoming?.section_name) {
    return (
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-info/20 bg-info-soft p-3 text-sm">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
        <p>
          {tr('Moves to')} <span className="font-medium">{upcoming.section_name}</span> {tr('on')} <span className="tabular-nums">{formatDate(upcoming.started_on)}</span>.
          {enrollment?.section_name && <> {tr('Until then they stay in {section_name}.', { section_name: enrollment.section_name })}</>}
        </p>
      </div>
    )
  }
  if (isEnrolled(student.status) && !enrollment?.section && !upcoming) {
    return (
      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm sm:flex-row sm:items-center">
        <School className="hidden h-4 w-4 shrink-0 text-warning sm:block" aria-hidden />
        <p className="flex-1">
          <span className="font-medium">{tr('Not in a class yet.')}</span> {tr('Until they are placed, they don’t appear on class registers, attendance or mark sheets.')}
        </p>
        {can(PERMS.students.place) && (
          <Button size="sm" onClick={onPlace}>
            {tr('Place in a class')}
          </Button>
        )}
      </div>
    )
  }
  return null
}

export default function StudentDetailPage() {
  const studentId = Number(useParams().id)
  const student = useStudent(studentId)
  const { isMultiBranch } = useBranches()
  const [params, setParams] = useSearchParams()
  const [statusTo, setStatusTo] = useState<StudentStatus | null>(null)
  const [placing, setPlacing] = useState(false)
  const [transferring, setTransferring] = useState(false)

  if (student.isPending) return <PageLoader />
  if (student.isError) return <ErrorState error={student.error} onRetry={() => void student.refetch()} />

  const s = student.data
  const enrollment = currentEnrollment(s)
  const tab = TABS.find((t) => t === params.get('tab')) ?? 'overview'
  const enrolled = ['active', 'suspended'] as const

  const actions: WorkflowAction[] = [
    {
      id: 'place',
      label: enrollment?.section ? tr('Move class') : tr('Place in class'),
      icon: School,
      from: enrolled,
      permission: PERMS.students.place,
      run: () => setPlacing(true),
    },
    ...(isMultiBranch
      ? [{ id: 'transfer', label: trc('student', 'Transfer'), icon: ArrowRightLeft, from: enrolled, permission: PERMS.students.changeStatus, run: () => setTransferring(true) }]
      : []),
    ...(Object.entries(STATUS_CHANGES) as Array<[StudentStatus, (typeof STATUS_CHANGES)[StudentStatus]]>).map(([to, c]) => ({
      id: to,
      label: c.verb,
      icon: STATUS_ICONS[to],
      from: c.from,
      permission: PERMS.students.changeStatus,
      variant: to === 'withdrawn' ? ('destructive' as const) : ('outline' as const),
      run: () => setStatusTo(to),
    })),
  ]

  return (
    <>
      <PageHeader
        backTo="/students"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {s.full_name}
            <StatusBadge status={s.status} label={enumLabel('StudentStatusEnum', s.status)} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{s.student_number}</span>
            {enrollment?.section_name ? ` · ${enrollment.section_name}` : ''}
            {enrollment?.program_name ? ` · ${enrollment.program_name}` : ''}
            {isMultiBranch ? ` · ${s.campus_name}` : ''}
          </>
        }
        actions={
          <PermissionGate permission={PERMS.students.update}>
            <Button asChild variant="outline" size="sm">
              <Link to={`/students/${s.id}/edit`}>
                <Pencil aria-hidden /> {tr('Edit details')}
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-5">
        <WorkflowActions status={s.status} actions={actions} />
      </div>

      <Attention student={s} onPlace={() => setPlacing(true)} />

      <Tabs value={tab} onValueChange={(t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="overview">{tr('Overview')}</TabsTrigger>
          <TabsTrigger value="history">{tr('Class history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="grid gap-6 rounded-lg border bg-card p-4 sm:p-6 lg:col-span-2">
              <Panel title={tr('Personal details')}>
                <dl className="grid gap-4 sm:grid-cols-3">
                  <Field label={tr('First name')}>{s.first_name}</Field>
                  <Field label={tr('Middle name')}>{s.middle_name}</Field>
                  <Field label={tr('Last name')}>{s.last_name}</Field>
                  <Field label={tr('Date of birth')}>{s.date_of_birth && <BsDateDisplay value={s.date_of_birth} />}</Field>
                  <Field label={tr('Gender')}>{s.gender ? enumLabel('GenderEnum', s.gender) : ''}</Field>
                </dl>
              </Panel>
              <Panel title={tr('Contact')}>
                <dl className="grid gap-4 sm:grid-cols-3">
                  <Field label={tr('Phone')}>{s.phone && <a href={`tel:${s.phone}`} className="tabular-nums hover:underline">{s.phone}</a>}</Field>
                  <Field label={tr('Email')}>{s.email && <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>}</Field>
                  <Field label={tr('Address')}>{s.address}</Field>
                </dl>
              </Panel>
            </div>
            <div className="rounded-lg border bg-card p-4 sm:p-6">
              <Panel title={tr('Enrollment')}>
                <dl className="grid gap-4">
                  <Field label={tr('Class')}>{enrollment?.section_name ?? (isEnrolled(s.status) ? tr('Not placed yet') : '')}</Field>
                  <Field label={tr('Program')}>{enrollment?.program_name}</Field>
                  <Field label={tr('Academic year')}>{enrollment?.academic_year_name}</Field>
                  {isMultiBranch && <Field label={tr('Branch')}>{s.campus_name}</Field>}
                  <Field label={tr('In this class since')}>{enrollment?.section ? <span className="tabular-nums">{formatDate(enrollment.started_on)}</span> : ''}</Field>
                  <Field label={tr('Admitted on')}>
                    <span className="tabular-nums">{formatDate(s.admitted_on)}</span>
                  </Field>
                  <Field label={tr('Portal login')}>{s.user ? tr('Linked') : tr('No login account')}</Field>
                </dl>
              </Panel>
              <div className="mt-6 border-t pt-5">
                <StudentParentsPanel studentId={s.id} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="rounded-lg border bg-card">
            <EnrollmentHistory studentId={s.id} />
          </div>
        </TabsContent>
      </Tabs>

      <StatusChangeDialog student={s} to={statusTo} onClose={() => setStatusTo(null)} />
      <PlaceStudentDialog student={s} open={placing} onOpenChange={setPlacing} />
      {isMultiBranch && <TransferStudentDialog student={s} open={transferring} onOpenChange={setTransferring} />}
    </>
  )
}
