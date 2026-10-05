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
import { tr } from '@/lib/i18n'

export default function DepartmentsPage() {
  const list = useListState({ defaultOrdering: 'name' })
  const query = useDepartments(list.query)
  const crud = useCrudState<Department>()
  const remove = useRemoveDepartment()

  const columns: Column<Department>[] = [
    { id: 'code', header: tr('Code'), sortField: 'code', className: 'w-28 font-mono text-xs', mobile: 'hidden', cell: (d) => d.code },
    { id: 'name', header: tr('Name'), sortField: 'name', mobile: 'title', cell: (d) => <span className="font-medium">{d.name}</span> },
    { id: 'head', header: tr('Head'), cell: (d) => d.head_name || <span className="text-muted-foreground">—</span> },
  ]

  return (
    <>
      <SectionHeader
        title={tr('Departments')}
        description={tr('Optional. Group programs and subjects, e.g. Science, Management.')}
        action={
          <PermissionGate permission={PERMS.academics.structure}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add department')}
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel={tr('Departments')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(d) => d.id}
        searchPlaceholder={tr('Search departments…')}
        rowActions={(d) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, permission: PERMS.academics.structure, onSelect: () => crud.openEdit(d) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.academics.structure, destructive: true, onSelect: () => crud.openDelete(d) },
            ]}
          />
        )}
        empty={{
          title: tr('No departments'),
          description: tr('Small schools often skip departments. Add them if you group subjects by faculty.'),
          action: (
            <PermissionGate permission={PERMS.academics.structure}>
              <Button variant="outline" onClick={crud.openCreate}>
                {tr('Add a department')}
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
          subject={tr('the {name} department', { name: crud.deleting.name })}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Department deleted.'))
          }}
        />
      )}
    </>
  )
}
