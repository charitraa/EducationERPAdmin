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
import { enumLabels } from '@/shared/api/enums.gen'
import { PERMS } from '@/shared/constants/permissions'
import { ADMISSION_ACTIONS_FROM, ADMISSION_STEPS, ADMISSION_TERMINAL, type Admission, type AdmissionDecision } from '../api/admissions.api'
import { AdmissionFormDialog } from '../components/AdmissionFormDialog'
import { DecisionDialog } from '../components/DecisionDialog'
import { EnrollDialog } from '../components/EnrollDialog'
import { useAdmission, useRemoveAdmission } from '../hooks/useAdmissions'

/** Pipeline wording; the backend's own labels are used for the badge. */
const STEP_LABELS = { pending: 'Under review', approved: 'Approved', enrolled: 'Enrolled', rejected: 'Rejected', withdrawn: 'Withdrawn' }

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
      return box('border-warning/25 bg-warning-soft', <p className="flex-1">Waiting for a decision. Approve to offer a place, or reject with a reason.</p>)
    case 'approved':
      return box(
        'border-info/20 bg-info-soft',
        <>
          <p className="flex-1">
            <span className="font-medium">Approved{a.decided_at ? ` on ${formatDate(a.decided_at)}` : ''}.</span> Enroll once the applicant confirms, to create their student record.
          </p>
          {can({ all: [PERMS.admissions.enroll, PERMS.students.create] }) && (
            <Button size="sm" onClick={onEnroll}>
              <UserPlus aria-hidden /> Enroll now
            </Button>
          )}
        </>,
      )
    case 'enrolled':
      return box(
        'border-success/20 bg-success-soft',
        <>
          <p className="flex-1">Enrolled. Their student record now holds their class, attendance and fees.</p>
          {a.student && can(PERMS.students.view) && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/students/${a.student}`}>
                <GraduationCap aria-hidden /> Open student record
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
            Application <span className="font-mono">{a.application_number}</span> · received {formatDate(a.applied_on)}
            {a.applying_for ? ` · for ${a.applying_for}` : ''}
            {isMultiBranch ? ` · ${a.campus_name}` : ''}
          </>
        }
        actions={
          <RowActions
            label="More actions"
            actions={[
              { label: 'Edit details', icon: Pencil, permission: PERMS.admissions.update, hidden: !(ADMISSION_ACTIONS_FROM.edit as readonly string[]).includes(a.status), onSelect: () => setEditing(true) },
              { label: 'Delete', icon: Trash2, permission: PERMS.admissions.delete, hidden: !(ADMISSION_ACTIONS_FROM.delete as readonly string[]).includes(a.status), destructive: true, onSelect: () => setDeleting(true) },
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
              { id: 'approve', label: 'Approve', icon: Check, variant: 'default', from: ADMISSION_ACTIONS_FROM.approve, permission: PERMS.admissions.review, run: () => setDecision('approve') },
              { id: 'enroll', label: 'Enroll', icon: UserPlus, variant: 'default', from: ADMISSION_ACTIONS_FROM.enroll, permission: { all: [PERMS.admissions.enroll, PERMS.students.create] }, run: () => setEnrolling(true) },
              { id: 'reject', label: 'Reject', icon: X, variant: 'destructive', from: ADMISSION_ACTIONS_FROM.reject, permission: PERMS.admissions.review, run: () => setDecision('reject') },
              { id: 'withdraw', label: 'Withdraw', icon: Undo2, from: ADMISSION_ACTIONS_FROM.withdraw, permission: PERMS.admissions.update, run: () => setDecision('withdraw') },
            ]}
          />
        </div>
      </div>

      <NextStep a={a} onEnroll={() => setEnrolling(true)} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="grid gap-6 rounded-lg border bg-card p-4 sm:p-6 lg:col-span-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold">Applicant</h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Field label="Full name">{a.full_name}</Field>
              <Field label="Date of birth">{a.date_of_birth && <BsDateDisplay value={a.date_of_birth} />}</Field>
              <Field label="Gender">{a.gender ? enumLabel('GenderEnum', a.gender) : ''}</Field>
              <Field label="Phone">{a.phone && <a href={`tel:${a.phone}`} className="tabular-nums hover:underline">{a.phone}</a>}</Field>
              <Field label="Email">{a.email && <a href={`mailto:${a.email}`} className="hover:underline">{a.email}</a>}</Field>
              <Field label="Previous school">{a.previous_school}</Field>
              <Field label="Address">{a.address}</Field>
            </dl>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Guardian</h2>
            {a.guardian_first_name ? (
              <dl className="grid gap-4 sm:grid-cols-3">
                <Field label="Name">{`${a.guardian_first_name} ${a.guardian_last_name}`.trim()}</Field>
                <Field label="Relationship">{relationship}</Field>
                <Field label="Phone">{a.guardian_phone && <a href={`tel:${a.guardian_phone}`} className="tabular-nums hover:underline">{a.guardian_phone}</a>}</Field>
                <Field label="Email">{a.guardian_email}</Field>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No guardian recorded. Add one under Parents after enrollment.</p>
            )}
          </div>
        </section>
        <section className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold">Decision</h2>
          {a.decided_at ? (
            <dl className="grid gap-4">
              <Field label="Decision">{enumLabels.AdmissionStatusEnum[a.status === 'enrolled' ? 'approved' : a.status]}</Field>
              <Field label="Decided at">
                <span className="tabular-nums">{formatDateTime(a.decided_at)}</span>
              </Field>
              <Field label="Note">{a.decision_note}</Field>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Not decided yet.</p>
          )}
        </section>
      </div>

      <DecisionDialog admission={a} decision={decision} onClose={() => setDecision(null)} />
      <EnrollDialog admission={a} open={enrolling} onOpenChange={setEnrolling} />
      <AdmissionFormDialog open={editing} onOpenChange={setEditing} record={a} />
      <DeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        subject={`application ${a.application_number}`}
        description="For applications recorded by mistake. To close a real one, reject or withdraw it instead."
        onConfirm={async () => {
          await remove.mutateAsync(a.id)
          toast.success('Application deleted.')
          navigate('/admissions', { replace: true })
        }}
      />
    </>
  )
}
