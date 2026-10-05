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
import { useDepartmentOptions } from '../../departments/hooks/useDepartments'
import type { Subject } from '../api/subjects.api'
import { SubjectFormDialog } from '../components/SubjectFormDialog'
import { useRemoveSubject, useSubjects } from '../hooks/useSubjects'
import { tr } from '@/lib/i18n'

export default function SubjectsPage() {
  const list = useListState({ filters: ['department'], defaultOrdering: 'name' })
  const query = useSubjects(list.query)
  const departments = useDepartmentOptions()
  const crud = useCrudState<Subject>()
  const remove = useRemoveSubject()
  const deptName = (id: number | null | undefined) => departments.data?.find((d) => d.value === String(id))?.label

  const columns: Column<Subject>[] = [
    { id: 'code', header: tr('Code'), sortField: 'code', className: 'w-24 font-mono text-xs', mobile: 'hidden', cell: (s) => s.code },
    { id: 'name', header: tr('Subject'), sortField: 'name', mobile: 'title', cell: (s) => <span className="font-medium">{s.name}</span> },
    { id: 'credits', header: tr('Credit hours'), className: 'tabular-nums', cell: (s) => s.credit_hours ?? <span className="text-muted-foreground">—</span> },
    { id: 'dept', header: tr('Department'), cell: (s) => deptName(s.department) ?? <span className="text-muted-foreground">—</span> },
  ]

  return (
    <>
      <SectionHeader
        title={tr('Subjects')}
        description={tr('Every subject taught anywhere in the school. Which level takes which is set in Curriculum.')}
        action={
          <PermissionGate permission={PERMS.academics.structure}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add subject')}
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel={tr('Subjects')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(s) => s.id}
        searchPlaceholder={tr('Search by code or name…')}
        filters={[{ name: 'department', label: tr('Department'), options: departments.data ?? [], hidden: !departments.data?.length }]}
        rowActions={(s) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, permission: PERMS.academics.structure, onSelect: () => crud.openEdit(s) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.academics.structure, destructive: true, onSelect: () => crud.openDelete(s) },
            ]}
          />
        )}
        empty={{
          title: tr('No subjects yet'),
          description: tr('Add the subjects you teach: English, Nepali, Mathematics, Physics…'),
          action: (
            <PermissionGate permission={PERMS.academics.structure}>
              <Button onClick={crud.openCreate}>
                <Plus aria-hidden /> {tr('Add the first subject')}
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <SubjectFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={tr('the subject {name}', { name: crud.deleting.name })}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Subject deleted.'))
          }}
        />
      )}
    </>
  )
}
