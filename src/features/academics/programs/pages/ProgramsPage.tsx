import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import { SectionHeader } from '../../components/SectionHeader'
import { useDepartmentOptions } from '../../departments/hooks/useDepartments'
import { levelLabel, type Program } from '../api/programs.api'
import { ProgramFormDialog } from '../components/ProgramFormDialog'
import { usePrograms, useRemoveProgram } from '../hooks/usePrograms'

export default function ProgramsPage() {
  const list = useListState({ filters: ['department', 'level_type', 'is_active'], defaultOrdering: 'name' })
  const query = usePrograms(list.query)
  const departments = useDepartmentOptions()
  const crud = useCrudState<Program>()
  const remove = useRemoveProgram()

  const columns: Column<Program>[] = [
    { id: 'code', header: 'Code', sortField: 'code', className: 'w-24 font-mono text-xs', mobile: 'hidden', cell: (p) => p.code },
    { id: 'name', header: 'Program', sortField: 'name', mobile: 'title', cell: (p) => <span className="font-medium">{p.name}</span> },
    {
      id: 'levels',
      header: 'Levels',
      cell: (p) =>
        p.first_level === p.last_level ? levelLabel(p, p.first_level ?? 1) : `${levelLabel(p, p.first_level ?? 1)} – ${p.last_level}`,
    },
    { id: 'mode', header: 'Roll call', cell: (p) => (p.attendance_mode === 'lesson' ? 'Every lesson' : 'Daily') },
    { id: 'dept', header: 'Department', cell: (p) => p.department_name || <span className="text-muted-foreground">—</span> },
    { id: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.is_active === false ? 'inactive' : 'active'} /> },
  ]

  return (
    <>
      <SectionHeader
        title="Programs"
        description='What you teach, and over which grades or semesters. "+2 Science", "Grade 1–10", "BBA".'
        action={
          <PermissionGate permission={PERMS.academics.structure}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add program
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel="Programs"
        columns={columns}
        query={query}
        list={list}
        getRowId={(p) => p.id}
        searchPlaceholder="Search programs…"
        filters={[
          { name: 'level_type', label: 'Levels are', options: enumOptions('LevelTypeEnum') },
          { name: 'department', label: 'Department', options: departments.data ?? [], hidden: !departments.data?.length },
          { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
        ]}
        rowActions={(p) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.academics.structure, onSelect: () => crud.openEdit(p) },
              { label: 'Delete', icon: Trash2, permission: PERMS.academics.structure, destructive: true, onSelect: () => crud.openDelete(p) },
            ]}
          />
        )}
        empty={{
          title: 'No programs yet',
          description: 'Programs hold your grades or semesters. Classes and the curriculum are built on them.',
          action: (
            <PermissionGate permission={PERMS.academics.structure}>
              <Button onClick={crud.openCreate}>
                <Plus aria-hidden /> Add the first program
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <ProgramFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`the program ${crud.deleting.name}`}
          description="A program that has classes or curriculum can't be deleted. Mark it inactive instead."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Program deleted.')
          }}
        />
      )}
    </>
  )
}
