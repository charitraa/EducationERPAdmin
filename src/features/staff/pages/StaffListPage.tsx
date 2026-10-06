import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { StaffMember } from '../api/staff.api'
import { useRemoveStaff, useStaffList } from '../hooks/useStaff'
import { tr, trc } from '@/lib/i18n'

const dash = <span className="text-muted-foreground">—</span>

export default function StaffListPage() {
  const navigate = useNavigate()
  const { isMultiBranch, branches } = useBranches()
  const list = useListState({ filters: ['status', 'staff_type', 'campus'], followBranch: true, defaultOrdering: 'first_name' })
  const query = useStaffList(list.query)
  const crud = useCrudState<StaffMember>()
  const remove = useRemoveStaff()

  const columns: Column<StaffMember>[] = [
    { id: 'number', header: tr('Employee no.'), sortField: 'employee_number', className: 'w-28 font-mono text-xs', mobile: 'hidden', cell: (m) => m.employee_number },
    {
      id: 'name',
      header: tr('Name'),
      sortField: 'first_name',
      mobile: 'title',
      cell: (m) => (
        <Link to={`/staff/${m.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
          {m.full_name}
        </Link>
      ),
    },
    { id: 'designation', header: tr('Designation'), cell: (m) => m.designation || dash },
    { id: 'type', header: tr('Type'), cell: (m) => enumLabel('StaffTypeEnum', m.staff_type) },
    { id: 'phone', header: tr('Phone'), cell: (m) => (m.phone ? <span className="tabular-nums">{m.phone}</span> : dash) },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (m) => m.campus_name },
    { id: 'status', header: tr('Status'), cell: (m) => <StatusBadge status={m.status ?? 'active'} label={enumLabel('StaffStatusEnum', m.status)} /> },
  ]

  const addButton = (label: string) => (
    <PermissionGate permission={PERMS.staff.create}>
      <Button asChild>
        <Link to="/staff/new">
          <Plus aria-hidden /> {label}
        </Link>
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <PageHeader title={tr('Staff')} description={tr('Teachers and everyone else who works at the school.')} actions={addButton(tr('Add staff member'))} />
      <DataTable
        ariaLabel={tr('Staff')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(m) => m.id}
        onRowClick={(m) => navigate(`/staff/${m.id}`)}
        searchPlaceholder={tr('Search by name, employee no., designation or phone…')}
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('StaffStatusEnum') },
          { name: 'staff_type', label: tr('Type'), options: enumOptions('StaffTypeEnum') },
          { name: 'campus', label: tr('Branch'), hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        rowActions={(m) => (
          <RowActions
            actions={[
              { label: trc('verb', 'Open'), icon: Eye, onSelect: () => navigate(`/staff/${m.id}`) },
              { label: tr('Edit details'), icon: Pencil, permission: PERMS.staff.update, onSelect: () => navigate(`/staff/${m.id}/edit`) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.staff.delete, destructive: true, onSelect: () => crud.openDelete(m) },
            ]}
          />
        )}
        empty={{ title: tr('No staff yet'), description: tr('Add teachers first: classes, timetables and attendance need them.'), action: addButton(tr('Add the first staff member')) }}
      />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`${crud.deleting.full_name} (${crud.deleting.employee_number})`}
          description={tr('Only for records added by mistake. When someone leaves, open their record and mark them as left instead.')}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Staff member deleted.'))
          }}
        />
      )}
    </>
  )
}
