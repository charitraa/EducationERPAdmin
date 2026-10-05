import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
import { tr } from '@/lib/i18n'

function Occupancy({ count, capacity }: { count: number; capacity: number | null | undefined }) {
  const full = capacity != null && count >= capacity
  return (
    <span className={cn('tabular-nums', full && 'font-medium text-warning')}>
      {count}
      {capacity != null && <span className="text-muted-foreground"> / {capacity}</span>}
      {full && <span className="sr-only"> {tr('(full)')}</span>}
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
  const navigate = useNavigate()

  const columns: Column<SchoolClass>[] = [
    { id: 'name', header: tr('Class'), sortField: 'name', mobile: 'title', cell: (c) => <span className="font-medium">{c.display_name}</span> },
    { id: 'program', header: tr('Program'), cell: (c) => c.program_name },
    { id: 'year', header: tr('Year'), cell: (c) => c.academic_year_name },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (c) => c.campus_name },
    { id: 'teacher', header: tr('Class teacher'), cell: (c) => c.class_teacher_name || <span className="text-muted-foreground">{tr('Not assigned')}</span> },
    { id: 'students', header: tr('Students'), cell: (c) => <Occupancy count={c.student_count} capacity={c.capacity} /> },
  ]

  return (
    <>
      <SectionHeader
        title={tr('Classes')}
        description={tr("Each year's classes. Students are placed into a class; attendance and marks follow it.")}
        action={
          <PermissionGate permission={PERMS.academics.classes}>
            <Button onClick={crud.openCreate} disabled={!years.data?.length || !programs.data?.length}>
              <Plus aria-hidden /> {tr('Add class')}
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel={tr('Classes')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(c) => c.id}
        searchPlaceholder={tr('Search classes or programs…')}
        filters={[
          {
            name: 'academic_year',
            label: tr('Academic year'),
            options: (years.data ?? []).map((y) => ({ value: String(y.id), label: y.is_current ? tr('{name} (current)', { name: y.name }) : y.name })),
          },
          { name: 'program', label: tr('Program'), options: (programs.data ?? []).map((p) => ({ value: String(p.id), label: p.name })) },
          { name: 'campus', label: tr('Branch'), hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        rowActions={(c) => (
          <RowActions
            actions={[
              { label: tr('Electives'), icon: ListChecks, onSelect: () => navigate(`/academics/electives?section=${c.id}`) },
              { label: tr('Edit'), icon: Pencil, permission: PERMS.academics.classes, onSelect: () => crud.openEdit(c) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.academics.classes, destructive: true, onSelect: () => crud.openDelete(c) },
            ]}
          />
        )}
        empty={{
          title: current.data ? tr('No classes in {name} yet', { name: current.data.name }) : tr('No classes yet'),
          description:
            !years.data?.length || !programs.data?.length
              ? tr('Add an academic year and a program first; classes belong to both.')
              : tr('Add a class for each group of students, e.g. Grade 11 A and Grade 11 B.'),
          action: (
            <PermissionGate permission={PERMS.academics.classes}>
              <Button onClick={crud.openCreate} disabled={!years.data?.length || !programs.data?.length}>
                <Plus aria-hidden /> {tr('Add the first class')}
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
          description={tr("A class with students or history can't be deleted.")}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Class deleted.'))
          }}
        />
      )}
    </>
  )
}
