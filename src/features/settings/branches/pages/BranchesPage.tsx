import { Info, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { PERMS } from '@/shared/constants/permissions'
import type { Campus } from '@/shared/types/organization'
import { BranchFormDialog } from '../components/BranchFormDialog'
import { useBranchList, useUpdateBranch } from '../hooks/useBranchResource'

/**
 * Settings → Branches. The only place to add a branch. Branches with history
 * are closed (deactivated), not deleted.
 */
export default function BranchesPage() {
  const list = useListState({ filters: ['is_active'], defaultOrdering: 'name' })
  const query = useBranchList(list.query)
  const { isMultiBranch, isLoading } = useBranches()
  const crud = useCrudState<Campus>()
  const update = useUpdateBranch()

  const columns: Column<Campus>[] = [
    {
      id: 'name',
      header: 'Branch',
      sortField: 'name',
      mobile: 'title',
      cell: (b) => (
        <span className="inline-flex items-center gap-2 font-medium">
          {b.name}
          {b.is_main && <span className="rounded border px-1.5 text-[10px] font-medium uppercase text-muted-foreground">Main</span>}
        </span>
      ),
    },
    { id: 'code', header: 'Code', sortField: 'code', className: 'font-mono text-xs', cell: (b) => b.code },
    { id: 'city', header: 'City', cell: (b) => b.city || '—' },
    { id: 'contact', header: 'Contact', cell: (b) => [b.phone, b.email].filter(Boolean).join(' · ') || '—' },
    { id: 'status', header: 'Status', cell: (b) => <StatusBadge status={b.is_active === false ? 'closed' : 'active'} label={b.is_active === false ? 'Closed' : 'Open'} /> },
  ]

  return (
    <>
      <PageHeader
        title="Branches"
        description="Each place your school teaches from."
        backTo="/settings"
        actions={
          <PermissionGate permission={PERMS.campuses.create}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add a branch
            </Button>
          </PermissionGate>
        }
      />
      {!isLoading && !isMultiBranch && (
        <div className="mb-4 flex gap-3 rounded-lg border border-info/20 bg-info-soft p-3 text-sm text-info">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Your school has one branch, so branch choices are hidden everywhere and new records use it automatically. Add a second branch and
            branch filters, columns and pickers will appear.
          </p>
        </div>
      )}
      <DataTable
        ariaLabel="Branches"
        columns={columns}
        query={query}
        list={list}
        getRowId={(b) => b.id}
        searchPlaceholder="Search branches…"
        filters={[{ name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'Open' }, { value: 'false', label: 'Closed' }] }]}
        rowActions={(b) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.campuses.update, onSelect: () => crud.openEdit(b) },
              { label: 'Close branch', icon: PowerOff, permission: PERMS.campuses.update, hidden: b.is_active === false || b.is_main, destructive: true, onSelect: () => crud.openDelete(b) },
              {
                label: 'Reopen branch',
                icon: Power,
                permission: PERMS.campuses.update,
                hidden: b.is_active !== false,
                onSelect: () => update.mutate({ id: b.id, input: { is_active: true } }, { onSuccess: () => toast.success(`${b.name} reopened.`) }),
              },
            ]}
          />
        )}
        empty={{ title: 'No branches', description: 'Your organization needs at least one branch.' }}
      />
      <BranchFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          title={`Close ${crud.deleting.name}?`}
          description="It stays on record with its history, but disappears from branch choices. You can reopen it later."
          confirmLabel="Close branch"
          tone="destructive"
          onConfirm={async () => {
            await update.mutateAsync({ id: crud.deleting!.id, input: { is_active: false } })
            toast.success(`${crud.deleting!.name} closed.`)
          }}
        />
      )}
    </>
  )
}
