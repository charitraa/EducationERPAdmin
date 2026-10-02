import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { BsDateDisplay } from '@/components/forms/BsDateDisplay'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { PERMS } from '@/shared/constants/permissions'
import { useAcademicYearOptions, useCurrentAcademicYear } from '../../academic-years/hooks/useAcademicYears'
import { SectionHeader } from '../../components/SectionHeader'
import type { Term } from '../api/terms.api'
import { TermFormDialog } from '../components/TermFormDialog'
import { useRemoveTerm, useTerms } from '../hooks/useTerms'

export default function TermsPage() {
  const list = useListState({ filters: ['academic_year'], defaultOrdering: 'sequence' })
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const query = useTerms(list.query)
  const crud = useCrudState<Term>()
  const remove = useRemoveTerm()
  const selectedYear = list.filters.academic_year ? Number(list.filters.academic_year) : (current.data?.id ?? null)

  const columns: Column<Term>[] = [
    { id: 'seq', header: '#', sortField: 'sequence', className: 'w-12 tabular-nums text-muted-foreground', mobile: 'hidden', cell: (t) => t.sequence },
    { id: 'name', header: 'Term', mobile: 'title', cell: (t) => <span className="font-medium">{t.name}</span> },
    { id: 'year', header: 'Academic year', cell: (t) => t.academic_year_name },
    { id: 'start', header: 'Starts', sortField: 'start_date', cell: (t) => <BsDateDisplay value={t.start_date} /> },
    { id: 'end', header: 'Ends', cell: (t) => <BsDateDisplay value={t.end_date} /> },
  ]

  return (
    <>
      <SectionHeader
        title="Terms"
        action={
          <PermissionGate permission={PERMS.academics.structure}>
            <Button onClick={crud.openCreate} disabled={!years.data?.length} title={years.data?.length ? undefined : 'Add an academic year first'}>
              <Plus aria-hidden /> Add term
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel="Terms"
        columns={columns}
        query={query}
        list={list}
        getRowId={(t) => t.id}
        searchable={false}
        filters={[
          {
            name: 'academic_year',
            label: 'Academic year',
            options: (years.data ?? []).map((y) => ({ value: String(y.id), label: y.is_current ? `${y.name} (current)` : y.name })),
          },
        ]}
        rowActions={(t) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.academics.structure, onSelect: () => crud.openEdit(t) },
              { label: 'Delete', icon: Trash2, permission: PERMS.academics.structure, destructive: true, onSelect: () => crud.openDelete(t) },
            ]}
          />
        )}
        empty={{
          title: 'No terms yet',
          description: years.data?.length ? 'Split the academic year into terms for exams and fees.' : 'Add an academic year first, then its terms.',
          action: (
            <PermissionGate permission={PERMS.academics.structure}>
              <Button onClick={crud.openCreate} disabled={!years.data?.length}>
                <Plus aria-hidden /> Add the first term
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <TermFormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        record={crud.record}
        defaultAcademicYear={selectedYear}
        nextSequence={(query.data?.count ?? 0) + 1}
      />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`${crud.deleting.name} (${crud.deleting.academic_year_name})`}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Term deleted.')
          }}
        />
      )}
    </>
  )
}
