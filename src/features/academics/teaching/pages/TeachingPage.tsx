import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import { useAcademicYearOptions, useCurrentAcademicYear } from '../../academic-years/hooks/useAcademicYears'
import { useClasses } from '../../classes/hooks/useClasses'
import { SectionHeader } from '../../components/SectionHeader'
import type { TeachingAssignment } from '../api/teaching.api'
import { TeachingAssignmentDialog } from '../components/TeachingAssignmentDialog'
import { useRemoveTeachingAssignment, useTeachingAssignments } from '../hooks/useTeaching'
import { tr } from '@/lib/i18n'

export default function TeachingPage() {
  const list = useListState({ filters: ['section__academic_year', 'section', 'teacher'], defaultOrdering: '' })
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  // This year's assignments by default; the newest year when none is marked current.
  const year = list.filters.section__academic_year ?? String(current.data?.id ?? years.data?.[0]?.id ?? '')
  const query = useTeachingAssignments({ ...list.query, section__academic_year: year || undefined }, { enabled: !years.isPending })
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: year || undefined, ordering: 'level' }, { enabled: Boolean(year) })
  const staff = useStaffOptions()
  const crud = useCrudState<TeachingAssignment>()
  const remove = useRemoveTeachingAssignment()

  const columns: Column<TeachingAssignment>[] = [
    { id: 'class', header: tr('Class'), mobile: 'title', cell: (a) => <span className="font-medium">{a.section_name}</span> },
    { id: 'subject', header: tr('Subject'), cell: (a) => a.subject_name },
    { id: 'teacher', header: tr('Teacher'), cell: (a) => a.teacher_name },
    { id: 'role', header: tr('Teaches'), cell: (a) => enumLabel('TeachingAssignmentRoleEnum', a.role) },
    { id: 'ppw', header: tr('Periods/week'), className: 'tabular-nums', mobile: 'hidden', cell: (a) => a.periods_per_week ?? <span className="text-muted-foreground">—</span> },
    { id: 'status', header: tr('Status'), cell: (a) => <StatusBadge status={a.is_active === false ? 'inactive' : 'active'} label={a.is_active === false ? tr('Handed over') : tr('Active')} /> },
  ]
  const add = (label: string) => (
    <PermissionGate permission={PERMS.academics.classes}>
      <Button onClick={crud.openCreate}>
        <Plus aria-hidden /> {label}
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <SectionHeader title={tr('Teaching')} description={tr('Who teaches each subject to each class. The timetable is built from these.')} action={add(tr('Assign a teacher'))} />
      <DataTable
        ariaLabel={tr('Teaching assignments')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(a) => a.id}
        searchable={false}
        filters={[
          { name: 'section__academic_year', label: tr('Academic year'), options: (years.data ?? []).map((y) => ({ value: String(y.id), label: y.is_current ? tr('{name} (current)', { name: y.name }) : y.name })) },
          { name: 'section', label: tr('Class'), options: (classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.display_name })) },
          { name: 'teacher', label: tr('Teacher'), hidden: !staff.canPick, options: staff.data ?? [] },
        ]}
        rowActions={(a) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, permission: PERMS.academics.classes, onSelect: () => crud.openEdit(a) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.academics.classes, destructive: true, onSelect: () => crud.openDelete(a) },
            ]}
          />
        )}
        empty={{ title: tr('Nobody assigned yet'), description: tr('Assign a teacher to each subject of each class, then build the timetable.'), action: add(tr('Assign the first teacher')) }}
      />
      <TeachingAssignmentDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} academicYear={year ? Number(year) : undefined} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={tr('{teacher_name} teaching {subject_name} to {section_name}', { teacher_name: crud.deleting.teacher_name, subject_name: crud.deleting.subject_name, section_name: crud.deleting.section_name })}
          description={tr('Not possible once it has timetable lessons or attendance; make it inactive, or use the timetable’s hand-over, instead.')}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Deleted.'))
          }}
        />
      )}
    </>
  )
}
