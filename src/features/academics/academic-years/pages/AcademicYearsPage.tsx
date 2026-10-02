import { CheckCircle2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { BsDateDisplay } from '@/components/forms/BsDateDisplay'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { PERMS } from '@/shared/constants/permissions'
import { SectionHeader } from '../../components/SectionHeader'
import type { AcademicYear } from '../api/academic-years.api'
import { AcademicYearFormDialog } from '../components/AcademicYearFormDialog'
import { useAcademicYears, useRemoveAcademicYear, useSetCurrentAcademicYear } from '../hooks/useAcademicYears'

export default function AcademicYearsPage() {
  const list = useListState({ filters: ['is_current'], defaultOrdering: '-start_date' })
  const query = useAcademicYears(list.query)
  const crud = useCrudState<AcademicYear>()
  const remove = useRemoveAcademicYear()
  const setCurrent = useSetCurrentAcademicYear()

  const columns: Column<AcademicYear>[] = [
    {
      id: 'name',
      header: 'Name',
      sortField: 'name',
      cell: (y) => (
        <span className="inline-flex items-center gap-2 font-medium">
          {y.name}
          {y.is_current && <StatusBadge status="current" label="Current" />}
        </span>
      ),
    },
    { id: 'start', header: 'Starts', sortField: 'start_date', cell: (y) => <BsDateDisplay value={y.start_date} /> },
    { id: 'end', header: 'Ends', cell: (y) => <BsDateDisplay value={y.end_date} /> },
  ]

  return (
    <>
      <SectionHeader
        title="Academic years"
        description="The current year is the default everywhere: classes, fees, exams."
        action={
          <PermissionGate permission={PERMS.academics.structure}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add academic year
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel="Academic years"
        columns={columns}
        query={query}
        list={list}
        getRowId={(y) => y.id}
        searchPlaceholder="Search years…"
        filters={[{ name: 'is_current', label: 'Current', options: [{ value: 'true', label: 'Current year' }, { value: 'false', label: 'Other years' }] }]}
        rowActions={(y) => (
          <RowActions
            actions={[
              {
                label: 'Make current',
                icon: Star,
                hidden: y.is_current,
                permission: PERMS.academics.structure,
                onSelect: () =>
                  setCurrent.mutate(y.id, { onSuccess: () => toast.success(`${y.name} is now the current academic year.`) }),
              },
              { label: 'Edit', icon: Pencil, permission: PERMS.academics.structure, onSelect: () => crud.openEdit(y) },
              { label: 'Delete', icon: Trash2, permission: PERMS.academics.structure, destructive: true, onSelect: () => crud.openDelete(y) },
            ]}
          />
        )}
        empty={{
          title: 'No academic years yet',
          description: 'Add the year you are teaching now, e.g. 2082/83. Terms and classes belong to a year.',
          action: (
            <PermissionGate permission={PERMS.academics.structure}>
              <Button onClick={crud.openCreate}>
                <CheckCircle2 aria-hidden /> Add the first academic year
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <AcademicYearFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`the academic year ${crud.deleting.name}`}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Academic year deleted.')
          }}
        />
      )}
    </>
  )
}
