import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import { useAcademicYearOptions, useCurrentAcademicYear } from '../../academic-years/hooks/useAcademicYears'
import { SectionHeader } from '../../components/SectionHeader'
import { useProgramOptions } from '../../programs/hooks/usePrograms'
import type { SchoolClass } from '../api/classes.api'
import { ClassFormDialog } from '../components/ClassFormDialog'
import { useClasses, useRemoveClass } from '../hooks/useClasses'

function Occupancy({ count, capacity }: { count: number; capacity: number | null | undefined }) {
  const full = capacity != null && count >= capacity
  return (
    <span className={cn('tabular-nums', full && 'font-medium text-warning')}>
      {count}
      {capacity != null && <span className="text-muted-foreground"> / {capacity}</span>}
      {full && <span className="sr-only"> (full)</span>}
    </span>
  )
}

export default function ClassesPage() {
  const { isMultiBranch, branches, selectedBranchId } = useBranches()
  const list = useListState({ filters: ['academic_year', 'program', 'campus'], defaultOrdering: 'level' })
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const programs = useProgramOptions()
  // Default to this year's classes, and to the header's branch.
  const year = list.filters.academic_year ?? (current.data ? String(current.data.id) : undefined)
  const query = useClasses({ ...list.query, academic_year: year, campus: list.filters.campus ?? selectedBranchId ?? undefined })
  const crud = useCrudState<SchoolClass>()
  const remove = useRemoveClass()

  const columns: Column<SchoolClass>[] = [
    { id: 'name', header: 'Class', sortField: 'name', mobile: 'title', cell: (c) => <span className="font-medium">{c.display_name}</span> },
    { id: 'program', header: 'Program', cell: (c) => c.program_name },
    { id: 'year', header: 'Year', cell: (c) => c.academic_year_name },
    { id: 'campus', header: 'Branch', hidden: !isMultiBranch, cell: (c) => c.campus_name },
    { id: 'teacher', header: 'Class teacher', cell: (c) => c.class_teacher_name || <span className="text-muted-foreground">Not assigned</span> },
    { id: 'students', header: 'Students', cell: (c) => <Occupancy count={c.student_count} capacity={c.capacity} /> },
  ]

  return (
    <>
      <SectionHeader
        title="Classes"
        description="Each year's classes. Students are placed into a class; attendance and marks follow it."
        action={
          <PermissionGate permission={PERMS.academics.classes}>
            <Button onClick={crud.openCreate} disabled={!years.data?.length || !programs.data?.length}>
              <Plus aria-hidden /> Add class
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel="Classes"
        columns={columns}
        query={query}
        list={list}
        getRowId={(c) => c.id}
        searchPlaceholder="Search classes or programs…"
        filters={[
          {
            name: 'academic_year',
            label: 'Academic year',
            options: (years.data ?? []).map((y) => ({ value: String(y.id), label: y.is_current ? `${y.name} (current)` : y.name })),
          },
          { name: 'program', label: 'Program', options: (programs.data ?? []).map((p) => ({ value: String(p.id), label: p.name })) },
          { name: 'campus', label: 'Branch', hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        rowActions={(c) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.academics.classes, onSelect: () => crud.openEdit(c) },
              { label: 'Delete', icon: Trash2, permission: PERMS.academics.classes, destructive: true, onSelect: () => crud.openDelete(c) },
            ]}
          />
        )}
        empty={{
          title: current.data ? `No classes in ${current.data.name} yet` : 'No classes yet',
          description:
            !years.data?.length || !programs.data?.length
              ? 'Add an academic year and a program first; classes belong to both.'
              : 'Add a class for each group of students, e.g. Grade 11 A and Grade 11 B.',
          action: (
            <PermissionGate permission={PERMS.academics.classes}>
              <Button onClick={crud.openCreate} disabled={!years.data?.length || !programs.data?.length}>
                <Plus aria-hidden /> Add the first class
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <ClassFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={crud.deleting.display_name}
          description="A class with students or history can't be deleted."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Class deleted.')
          }}
        />
      )}
    </>
  )
}
