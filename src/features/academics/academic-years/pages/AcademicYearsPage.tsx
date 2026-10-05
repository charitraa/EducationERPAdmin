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
import { tr } from '@/lib/i18n'

export default function AcademicYearsPage() {
  const list = useListState({ filters: ['is_current'], defaultOrdering: '-start_date' })
  const query = useAcademicYears(list.query)
  const crud = useCrudState<AcademicYear>()
  const remove = useRemoveAcademicYear()
  const setCurrent = useSetCurrentAcademicYear()

  const columns: Column<AcademicYear>[] = [
    {
      id: 'name',
      header: tr('Name'),
      sortField: 'name',
      cell: (y) => (
        <span className="inline-flex items-center gap-2 font-medium">
          {y.name}
          {y.is_current && <StatusBadge status="current" label={tr('Current')} />}
        </span>
      ),
    },
    { id: 'start', header: tr('Starts'), sortField: 'start_date', cell: (y) => <BsDateDisplay value={y.start_date} /> },
    { id: 'end', header: tr('Ends'), cell: (y) => <BsDateDisplay value={y.end_date} /> },
  ]

  return (
    <>
      <SectionHeader
        title={tr('Academic years')}
        description={tr('The current year is the default everywhere: classes, fees, exams.')}
        action={
          <PermissionGate permission={PERMS.academics.structure}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add academic year')}
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel={tr('Academic years')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(y) => y.id}
        searchPlaceholder={tr('Search years…')}
        filters={[{ name: 'is_current', label: tr('Current'), options: [{ value: 'true', label: tr('Current year') }, { value: 'false', label: tr('Other years') }] }]}
        rowActions={(y) => (
          <RowActions
            actions={[
              {
                label: tr('Make current'),
                icon: Star,
                hidden: y.is_current,
                permission: PERMS.academics.structure,
                onSelect: () =>
                  setCurrent.mutate(y.id, { onSuccess: () => toast.success(tr('{name} is now the current academic year.', { name: y.name })) }),
              },
              { label: tr('Edit'), icon: Pencil, permission: PERMS.academics.structure, onSelect: () => crud.openEdit(y) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.academics.structure, destructive: true, onSelect: () => crud.openDelete(y) },
            ]}
          />
        )}
        empty={{
          title: tr('No academic years yet'),
          description: tr('Add the year you are teaching now, e.g. 2082/83. Terms and classes belong to a year.'),
          action: (
            <PermissionGate permission={PERMS.academics.structure}>
              <Button onClick={crud.openCreate}>
                <CheckCircle2 aria-hidden /> {tr('Add the first academic year')}
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
          subject={tr('the academic year {name}', { name: crud.deleting.name })}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Academic year deleted.'))
          }}
        />
      )}
    </>
  )
}
