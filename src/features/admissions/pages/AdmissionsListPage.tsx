import { CheckCircle2, Clock, Eye, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatCard } from '@/components/data-display/StatCard'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import { ADMISSION_ACTIONS_FROM, type Admission, type AdmissionStatus } from '../api/admissions.api'
import { AdmissionFormDialog } from '../components/AdmissionFormDialog'
import { useAdmissionCount, useAdmissions, useRemoveAdmission } from '../hooks/useAdmissions'

const can = (action: keyof typeof ADMISSION_ACTIONS_FROM, status: string) => (ADMISSION_ACTIONS_FROM[action] as readonly string[]).includes(status)

/** What needs attention: how many are waiting at each step. Each card filters the list. */
function Pipeline({ active }: { active?: string }) {
  const { selectedBranchId } = useBranches()
  const cards: Array<{ status: AdmissionStatus; label: string; hint: string; icon: typeof Clock }> = [
    { status: 'pending', label: 'To review', hint: 'Waiting for a decision', icon: Clock },
    { status: 'approved', label: 'To enroll', hint: 'Approved, no student record yet', icon: CheckCircle2 },
    { status: 'enrolled', label: 'Enrolled', hint: 'Now students', icon: ShieldCheck },
  ]
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <PipelineCard key={c.status} {...c} campus={selectedBranchId} active={active === c.status} />
      ))}
    </div>
  )
}

function PipelineCard({ status, label, hint, icon, campus, active }: { status: AdmissionStatus; label: string; hint: string; icon: typeof Clock; campus: number | null; active: boolean }) {
  const count = useAdmissionCount(status, campus)
  return (
    <StatCard
      label={label}
      value={count.data ?? 0}
      hint={hint}
      icon={icon}
      loading={count.isPending}
      error={count.isError}
      to={active ? '?' : `?status=${status}`}
      className={cn(active && 'border-primary ring-1 ring-primary/30')}
    />
  )
}

export default function AdmissionsListPage() {
  const navigate = useNavigate()
  const { isMultiBranch, branches, selectedBranchId } = useBranches()
  const list = useListState({ filters: ['status', 'campus'], defaultOrdering: '-applied_on' })
  const query = useAdmissions({ ...list.query, campus: list.filters.campus ?? selectedBranchId ?? undefined })
  const crud = useCrudState<Admission>()
  const remove = useRemoveAdmission()

  const columns: Column<Admission>[] = [
    { id: 'number', header: 'App. no.', sortField: 'application_number', className: 'w-28 font-mono text-xs', mobile: 'hidden', cell: (a) => a.application_number },
    { id: 'name', header: 'Applicant', mobile: 'title', cell: (a) => <span className="font-medium">{a.full_name}</span> },
    { id: 'for', header: 'Applying for', cell: (a) => a.applying_for || <span className="text-muted-foreground">—</span> },
    {
      id: 'contact',
      header: 'Contact',
      cell: (a) => {
        const phone = a.guardian_phone || a.phone
        return phone ? <span className="tabular-nums">{phone}</span> : <span className="text-muted-foreground">—</span>
      },
    },
    { id: 'applied', header: 'Received', sortField: 'applied_on', className: 'tabular-nums', cell: (a) => formatDate(a.applied_on) },
    { id: 'campus', header: 'Branch', hidden: !isMultiBranch, cell: (a) => a.campus_name },
    { id: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status} label={enumLabel('AdmissionStatusEnum', a.status)} /> },
  ]

  const addButton = (label: string) => (
    <PermissionGate permission={PERMS.admissions.create}>
      <Button onClick={crud.openCreate}>
        <Plus aria-hidden /> {label}
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <PageHeader title="Admissions" description="Applications from first contact to enrollment." actions={addButton('Record application')} />
      <Pipeline active={list.filters.status} />
      <DataTable
        ariaLabel="Applications"
        columns={columns}
        query={query}
        list={list}
        getRowId={(a) => a.id}
        onRowClick={(a) => navigate(`/admissions/${a.id}`)}
        searchPlaceholder="Search by name, application no., phone or email…"
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('AdmissionStatusEnum') },
          { name: 'campus', label: 'Branch', hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        rowActions={(a) => (
          <RowActions
            actions={[
              { label: 'Open', icon: Eye, onSelect: () => navigate(`/admissions/${a.id}`) },
              { label: 'Edit', icon: Pencil, permission: PERMS.admissions.update, hidden: !can('edit', a.status), onSelect: () => crud.openEdit(a) },
              { label: 'Delete', icon: Trash2, permission: PERMS.admissions.delete, hidden: !can('delete', a.status), destructive: true, onSelect: () => crud.openDelete(a) },
            ]}
          />
        )}
        empty={{
          title: 'No applications yet',
          description: 'Record applications received at the front desk. Online applications appear here too.',
          action: addButton('Record the first application'),
        }}
      />
      <AdmissionFormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        record={crud.record}
        onCreated={(a) => navigate(`/admissions/${a.id}`)}
      />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`application ${crud.deleting.application_number}`}
          description="For applications recorded by mistake. To close a real one, reject or withdraw it instead so it stays on record."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Application deleted.')
          }}
        />
      )}
    </>
  )
}
