import { Check, GraduationCap, Pencil, Trash2, Undo2, UserPlus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { BsDateDisplay } from '@/components/forms/BsDateDisplay'
import { Button } from '@/components/ui/button'
import { StatusTimeline } from '@/components/workflow/StatusTimeline'
import { WorkflowActions } from '@/components/workflow/WorkflowActions'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import { ADMISSION_ACTIONS_FROM, ADMISSION_STEPS, ADMISSION_TERMINAL, type Admission, type AdmissionDecision } from '../api/admissions.api'
import { AdmissionFormDialog } from '../components/AdmissionFormDialog'
import { DecisionDialog } from '../components/DecisionDialog'
import { EnrollDialog } from '../components/EnrollDialog'
import { useAdmission, useRemoveAdmission } from '../hooks/useAdmissions'
import { tr } from '@/lib/i18n'

/** Pipeline wording; the backend's own labels are used for the badge. */
const STEP_LABELS = { pending: tr('Under review'), approved: tr('Approved'), enrolled: tr('Enrolled'), rejected: tr('Rejected'), withdrawn: tr('Withdrawn') }

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

/** What happens next, in a sentence, for the current status. */
function NextStep({ a, onEnroll }: { a: Admission; onEnroll: () => void }) {
  const { can } = usePermissions()
  const box = (tone: string, children: ReactNode) => <div className={`mb-5 flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-center ${tone}`}>{children}</div>
  switch (a.status) {
    case 'pending':
      return box('border-warning/25 bg-warning-soft', <p className="flex-1">{tr('Waiting for a decision. Approve to offer a place, or reject with a reason.')}</p>)
    case 'approved':
      return box(
        'border-info/20 bg-info-soft',
        <>
          <p className="flex-1">
            <span className="font-medium">{tr('Approved')}{a.decided_at ? ' ' + tr('on {date}', { date: formatDate(a.decided_at) }) : ''}.</span> {tr('Enroll once the applicant confirms, to create their student record.')}
          </p>
          {can({ all: [PERMS.admissions.enroll, PERMS.students.create] }) && (
            <Button size="sm" onClick={onEnroll}>
              <UserPlus aria-hidden /> {tr('Enroll now')}
            </Button>
          )}
        </>,
      )
    case 'enrolled':
      return box(
        'border-success/20 bg-success-soft',
        <>
          <p className="flex-1">{tr('Enrolled. Their student record now holds their class, attendance and fees.')}</p>
          {a.student && can(PERMS.students.view) && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/students/${a.student}`}>
                <GraduationCap aria-hidden /> {tr('Open student record')}
              </Link>
            </Button>
          )}
        </>,
      )
    default:
      return null
  }
}

export default function AdmissionDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const admission = useAdmission(id)
  const { isMultiBranch } = useBranches()
  const remove = useRemoveAdmission()
  const [decision, setDecision] = useState<AdmissionDecision | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (admission.isPending) return <PageLoader />
  if (admission.isError) return <ErrorState error={admission.error} onRetry={() => void admission.refetch()} />
  const a = admission.data
  const relationship = a.guardian_relationship ? enumLabel('RelationshipEnum', a.guardian_relationship) : ''

  return (
    <>
      <PageHeader
        backTo="/admissions"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {a.full_name}
            <StatusBadge status={a.status} label={enumLabel('AdmissionStatusEnum', a.status)} />
          </span>
        }
        description={
          <>
            {tr('Application')} <span className="font-mono">{a.application_number}</span> {'· ' + tr('received {date}', { date: formatDate(a.applied_on) })}
            {a.applying_for ? ' · ' + tr('for {applying_for}', { applying_for: a.applying_for }) : ''}
            {isMultiBranch ? ` · ${a.campus_name}` : ''}
          </>
        }
        actions={
          <RowActions
            label={tr('More actions')}
            actions={[
              { label: tr('Edit details'), icon: Pencil, permission: PERMS.admissions.update, hidden: !(ADMISSION_ACTIONS_FROM.edit as readonly string[]).includes(a.status), onSelect: () => setEditing(true) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.admissions.delete, hidden: !(ADMISSION_ACTIONS_FROM.delete as readonly string[]).includes(a.status), destructive: true, onSelect: () => setDeleting(true) },
            ]}
          />
        }
      />

      <div className="mb-5 rounded-lg border bg-card p-4">
        <StatusTimeline steps={ADMISSION_STEPS} terminal={ADMISSION_TERMINAL} current={a.status} labels={STEP_LABELS} />
        <div className="mt-4">
          <WorkflowActions
            status={a.status}
            actions={[
              { id: 'approve', label: tr('Approve'), icon: Check, variant: 'default', from: ADMISSION_ACTIONS_FROM.approve, permission: PERMS.admissions.review, run: () => setDecision('approve') },
              { id: 'enroll', label: tr('Enroll'), icon: UserPlus, variant: 'default', from: ADMISSION_ACTIONS_FROM.enroll, permission: { all: [PERMS.admissions.enroll, PERMS.students.create] }, run: () => setEnrolling(true) },
              { id: 'reject', label: tr('Reject'), icon: X, variant: 'destructive', from: ADMISSION_ACTIONS_FROM.reject, permission: PERMS.admissions.review, run: () => setDecision('reject') },
              { id: 'withdraw', label: tr('Withdraw'), icon: Undo2, from: ADMISSION_ACTIONS_FROM.withdraw, permission: PERMS.admissions.update, run: () => setDecision('withdraw') },
            ]}
          />
        </div>
      </div>

      <NextStep a={a} onEnroll={() => setEnrolling(true)} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="grid gap-6 rounded-lg border bg-card p-4 sm:p-6 lg:col-span-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold">{tr('Applicant')}</h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Field label={tr('Full name')}>{a.full_name}</Field>
              <Field label={tr('Date of birth')}>{a.date_of_birth && <BsDateDisplay value={a.date_of_birth} />}</Field>
              <Field label={tr('Gender')}>{a.gender ? enumLabel('GenderEnum', a.gender) : ''}</Field>
              <Field label={tr('Phone')}>{a.phone && <a href={`tel:${a.phone}`} className="tabular-nums hover:underline">{a.phone}</a>}</Field>
              <Field label={tr('Email')}>{a.email && <a href={`mailto:${a.email}`} className="hover:underline">{a.email}</a>}</Field>
              <Field label={tr('Previous school')}>{a.previous_school}</Field>
              <Field label={tr('Address')}>{a.address}</Field>
            </dl>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">{tr('Guardian')}</h2>
            {a.guardian_first_name ? (
              <dl className="grid gap-4 sm:grid-cols-3">
                <Field label={tr('Name')}>{`${a.guardian_first_name} ${a.guardian_last_name}`.trim()}</Field>
                <Field label={tr('Relationship')}>{relationship}</Field>
                <Field label={tr('Phone')}>{a.guardian_phone && <a href={`tel:${a.guardian_phone}`} className="tabular-nums hover:underline">{a.guardian_phone}</a>}</Field>
                <Field label={tr('Email')}>{a.guardian_email}</Field>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{tr('No guardian recorded. Add one under Parents after enrollment.')}</p>
            )}
          </div>
        </section>
        <section className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold">{tr('Decision')}</h2>
          {a.decided_at ? (
            <dl className="grid gap-4">
              <Field label={tr('Decision')}>{enumLabel('AdmissionStatusEnum', a.status === 'enrolled' ? 'approved' : a.status)}</Field>
              <Field label={tr('Decided at')}>
                <span className="tabular-nums">{formatDateTime(a.decided_at)}</span>
              </Field>
              <Field label={tr('Note')}>{a.decision_note}</Field>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{tr('Not decided yet.')}</p>
          )}
        </section>
      </div>

      <DecisionDialog admission={a} decision={decision} onClose={() => setDecision(null)} />
      <EnrollDialog admission={a} open={enrolling} onOpenChange={setEnrolling} />
      <AdmissionFormDialog open={editing} onOpenChange={setEditing} record={a} />
      <DeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        subject={tr('application {application_number}', { application_number: a.application_number })}
        description={tr('For applications recorded by mistake. To close a real one, reject or withdraw it instead.')}
        onConfirm={async () => {
          await remove.mutateAsync(a.id)
          toast.success(tr('Application deleted.'))
          navigate('/admissions', { replace: true })
        }}
      />
    </>
  )
}
