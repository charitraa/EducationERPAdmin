import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { PERMS } from '@/shared/constants/permissions'
import { SectionHeader } from '../../components/SectionHeader'
import type { Department } from '../api/departments.api'
import { DepartmentFormDialog } from '../components/DepartmentFormDialog'
import { useDepartments, useRemoveDepartment } from '../hooks/useDepartments'

export default function DepartmentsPage() {
  const list = useListState({ defaultOrdering: 'name' })
  const query = useDepartments(list.query)
  const crud = useCrudState<Department>()
  const remove = useRemoveDepartment()

  const columns: Column<Department>[] = [
    { id: 'code', header: 'Code', sortField: 'code', className: 'w-28 font-mono text-xs', mobile: 'hidden', cell: (d) => d.code },
    { id: 'name', header: 'Name', sortField: 'name', mobile: 'title', cell: (d) => <span className="font-medium">{d.name}</span> },
    { id: 'head', header: 'Head', cell: (d) => d.head_name || <span className="text-muted-foreground">—</span> },
  ]

  return (
    <>
      <SectionHeader
        title="Departments"
        description="Optional. Group programs and subjects, e.g. Science, Management."
        action={
          <PermissionGate permission={PERMS.academics.structure}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add department
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel="Departments"
        columns={columns}
        query={query}
        list={list}
        getRowId={(d) => d.id}
        searchPlaceholder="Search departments…"
        rowActions={(d) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.academics.structure, onSelect: () => crud.openEdit(d) },
              { label: 'Delete', icon: Trash2, permission: PERMS.academics.structure, destructive: true, onSelect: () => crud.openDelete(d) },
            ]}
          />
        )}
        empty={{
          title: 'No departments',
          description: 'Small schools often skip departments. Add them if you group subjects by faculty.',
          action: (
            <PermissionGate permission={PERMS.academics.structure}>
              <Button variant="outline" onClick={crud.openCreate}>
                Add a department
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <DepartmentFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`the ${crud.deleting.name} department`}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Department deleted.')
          }}
        />
      )}
    </>
  )
}
