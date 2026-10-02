import { LogOut, Pause, Pencil, Play, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { BsDateDisplay } from '@/components/forms/BsDateDisplay'
import { Button } from '@/components/ui/button'
import { WorkflowActions } from '@/components/workflow/WorkflowActions'
import { enumLabel } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import { STAFF_STATUS_CHANGES, StaffStatusDialog } from '../components/StaffStatusDialog'
import { useStaffMember } from '../hooks/useStaff'

const ICONS = { leave: Pause, back: Play, left: LogOut, rejoin: RotateCcw }

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

export default function StaffDetailPage() {
  const id = Number(useParams().id)
  const member = useStaffMember(id)
  const { isMultiBranch } = useBranches()
  const [change, setChange] = useState<string | null>(null)

  if (member.isPending) return <PageLoader />
  if (member.isError) return <ErrorState error={member.error} onRetry={() => void member.refetch()} />
  const m = member.data
  const status = m.status ?? 'active'

  return (
    <>
      <PageHeader
        backTo="/staff"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {m.full_name}
            <StatusBadge status={status} label={enumLabel('StaffStatusEnum', status)} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{m.employee_number}</span>
            {m.designation ? ` · ${m.designation}` : ''} · {enumLabel('StaffTypeEnum', m.staff_type)}
            {isMultiBranch ? ` · ${m.campus_name}` : ''}
          </>
        }
        actions={
          <PermissionGate permission={PERMS.staff.update}>
            <Button asChild variant="outline" size="sm">
              <Link to={`/staff/${m.id}/edit`}>
                <Pencil aria-hidden /> Edit details
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-5">
        <WorkflowActions
          status={status}
          actions={Object.entries(STAFF_STATUS_CHANGES).map(([key, c]) => ({
            id: key,
            label: c.label,
            icon: ICONS[key as keyof typeof ICONS],
            from: c.from,
            permission: PERMS.staff.update,
            variant: key === 'left' ? ('destructive' as const) : ('outline' as const),
            run: () => setChange(key),
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="grid gap-6 rounded-lg border bg-card p-4 sm:p-6 lg:col-span-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold">Profile</h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Field label="First name">{m.first_name}</Field>
              <Field label="Middle name">{m.middle_name}</Field>
              <Field label="Last name">{m.last_name}</Field>
              <Field label="Date of birth">{m.date_of_birth && <BsDateDisplay value={m.date_of_birth} />}</Field>
              <Field label="Gender">{m.gender ? enumLabel('GenderEnum', m.gender) : ''}</Field>
            </dl>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Contact</h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Field label="Phone">{m.phone && <a href={`tel:${m.phone}`} className="tabular-nums hover:underline">{m.phone}</a>}</Field>
              <Field label="Email">{m.email && <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a>}</Field>
              <Field label="Address">{m.address}</Field>
            </dl>
          </div>
        </section>
        <section className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold">Employment</h2>
          <dl className="grid gap-4">
            <Field label="Type">{enumLabel('StaffTypeEnum', m.staff_type)}</Field>
            <Field label="Designation">{m.designation}</Field>
            {isMultiBranch && <Field label="Branch">{m.campus_name}</Field>}
            <Field label="Joined on">{m.joined_on && <BsDateDisplay value={m.joined_on} />}</Field>
            {status === 'left' && <Field label="Left on">{m.left_on && <BsDateDisplay value={m.left_on} />}</Field>}
            <Field label="Portal login">{m.user ? 'Linked' : 'No login account'}</Field>
          </dl>
        </section>
      </div>

      <StaffStatusDialog member={m} change={change} onClose={() => setChange(null)} />
    </>
  )
}
