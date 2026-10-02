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
import { currentEnrollment, type Student } from '../api/students.api'
import { useRemoveStudent, useStudents } from '../hooks/useStudents'

const muted = (text: string) => <span className="text-muted-foreground">{text}</span>

export default function StudentsListPage() {
  const navigate = useNavigate()
  const { isMultiBranch, branches, selectedBranchId } = useBranches()
  const list = useListState({ filters: ['status', 'gender', 'campus'], defaultOrdering: 'first_name' })
  const query = useStudents({ ...list.query, campus: list.filters.campus ?? selectedBranchId ?? undefined })
  const crud = useCrudState<Student>()
  const remove = useRemoveStudent()

  const columns: Column<Student>[] = [
    { id: 'number', header: 'Student no.', sortField: 'student_number', className: 'w-28 font-mono text-xs', mobile: 'hidden', cell: (s) => s.student_number },
    {
      id: 'name',
      header: 'Name',
      sortField: 'first_name',
      mobile: 'title',
      cell: (s) => (
        <Link to={`/students/${s.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
          {s.full_name}
        </Link>
      ),
    },
    { id: 'class', header: 'Class', cell: (s) => currentEnrollment(s)?.section_name || muted('Not placed') },
    { id: 'program', header: 'Program', mobile: 'hidden', cell: (s) => currentEnrollment(s)?.program_name || muted('—') },
    {
      id: 'contact',
      header: 'Contact',
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
    { id: 'campus', header: 'Branch', hidden: !isMultiBranch, cell: (s) => s.campus_name },
    { id: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} label={enumLabel('StudentStatusEnum', s.status)} /> },
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
      <PageHeader title="Students" description="Everyone enrolled at your school, their class and where they stand." actions={addButton('Add student')} />
      <DataTable
        ariaLabel="Students"
        columns={columns}
        query={query}
        list={list}
        getRowId={(s) => s.id}
        onRowClick={(s) => navigate(`/students/${s.id}`)}
        searchPlaceholder="Search by name, student no., phone or email…"
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('StudentStatusEnum') },
          { name: 'gender', label: 'Gender', options: enumOptions('GenderEnum') },
          { name: 'campus', label: 'Branch', hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        rowActions={(s) => (
          <RowActions
            actions={[
              { label: 'Open', icon: Eye, onSelect: () => navigate(`/students/${s.id}`) },
              { label: 'Edit details', icon: Pencil, permission: PERMS.students.update, onSelect: () => navigate(`/students/${s.id}/edit`) },
              { label: 'Delete', icon: Trash2, permission: PERMS.students.delete, destructive: true, onSelect: () => crud.openDelete(s) },
            ]}
          />
        )}
        empty={{
          title: 'No students yet',
          description: 'Add students one at a time here, or enroll them from an approved admission.',
          action: addButton('Add the first student'),
        }}
      />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`${crud.deleting.full_name} (${crud.deleting.student_number})`}
          description="Only for records added by mistake. To record a student leaving, open their record and withdraw or graduate them instead."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Student deleted.')
          }}
        />
      )}
    </>
  )
}
