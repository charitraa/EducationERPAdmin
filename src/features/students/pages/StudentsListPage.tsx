import { Eye, Pencil, Plus, Trash2, Upload } from 'lucide-react'
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
import { currentEnrollment, type Student } from '../api/students.api'
import { useRemoveStudent, useStudents } from '../hooks/useStudents'
import { tr, trc } from '@/lib/i18n'

const muted = (text: string) => <span className="text-muted-foreground">{text}</span>

export default function StudentsListPage() {
  const navigate = useNavigate()
  const { isMultiBranch, branches } = useBranches()
  const list = useListState({ filters: ['status', 'gender', 'campus'], followBranch: true, defaultOrdering: 'first_name' })
  const query = useStudents(list.query)
  const crud = useCrudState<Student>()
  const remove = useRemoveStudent()

  const columns: Column<Student>[] = [
    { id: 'number', header: tr('Student no.'), sortField: 'student_number', className: 'w-28 font-mono text-xs', mobile: 'hidden', cell: (s) => s.student_number },
    {
      id: 'name',
      header: tr('Name'),
      sortField: 'first_name',
      mobile: 'title',
      cell: (s) => (
        <Link to={`/students/${s.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
          {s.full_name}
        </Link>
      ),
    },
    { id: 'class', header: tr('Class'), cell: (s) => currentEnrollment(s)?.section_name || muted('Not placed') },
    { id: 'program', header: tr('Program'), mobile: 'hidden', cell: (s) => currentEnrollment(s)?.program_name || muted('—') },
    {
      id: 'contact',
      header: tr('Contact'),
      cell: (s) =>
        s.phone || s.email ? (
          <span className="grid text-xs">
            {s.phone && <span className="tabular-nums">{s.phone}</span>}
            {s.email && <span className="truncate text-muted-foreground">{s.email}</span>}
          </span>
        ) : (
          muted('—')
        ),
    },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (s) => s.campus_name },
    { id: 'status', header: tr('Status'), cell: (s) => <StatusBadge status={s.status} label={enumLabel('StudentStatusEnum', s.status)} /> },
  ]

  const addButton = (label: string) => (
    <PermissionGate permission={PERMS.students.create}>
      <Button asChild>
        <Link to="/students/new">
          <Plus aria-hidden /> {label}
        </Link>
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <PageHeader title={tr('Students')} description={tr('Everyone enrolled at your school, their class and where they stand.')} actions={
          <>
            <PermissionGate permission={PERMS.students.create}>
              <Button asChild variant="outline">
                <Link to="/students/import">
                  <Upload aria-hidden /> {tr('Import')}
                </Link>
              </Button>
            </PermissionGate>
            {addButton(tr('Add student'))}
          </>
        }
      />
      <DataTable
        ariaLabel={tr('Students')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(s) => s.id}
        onRowClick={(s) => navigate(`/students/${s.id}`)}
        searchPlaceholder={tr('Search by name, student no., phone or email…')}
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('StudentStatusEnum') },
          { name: 'gender', label: tr('Gender'), options: enumOptions('GenderEnum') },
          { name: 'campus', label: tr('Branch'), hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        rowActions={(s) => (
          <RowActions
            actions={[
              { label: trc('verb', 'Open'), icon: Eye, onSelect: () => navigate(`/students/${s.id}`) },
              { label: tr('Edit details'), icon: Pencil, permission: PERMS.students.update, onSelect: () => navigate(`/students/${s.id}/edit`) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.students.delete, destructive: true, onSelect: () => crud.openDelete(s) },
            ]}
          />
        )}
        empty={{
          title: tr('No students yet'),
          description: tr('Add students one at a time, import a spreadsheet of them, or enroll them from an approved admission.'),
          action: addButton(tr('Add the first student')),
        }}
      />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`${crud.deleting.full_name} (${crud.deleting.student_number})`}
          description={tr('Only for records added by mistake. To record a student leaving, open their record and withdraw or graduate them instead.')}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Student deleted.'))
          }}
        />
      )}
    </>
  )
}
