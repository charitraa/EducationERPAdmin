import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { PERMS } from '@/shared/constants/permissions'
import type { Parent } from '../api/parents.api'
import { ParentFormDialog } from '../components/ParentFormDialog'
import { useParents, useRemoveParent } from '../hooks/useParents'

const dash = <span className="text-muted-foreground">—</span>

export default function ParentsListPage() {
  const navigate = useNavigate()
  const list = useListState({ defaultOrdering: 'first_name' })
  const query = useParents(list.query)
  const crud = useCrudState<Parent>()
  const remove = useRemoveParent()

  const columns: Column<Parent>[] = [
    { id: 'name', header: 'Name', sortField: 'first_name', mobile: 'title', cell: (p) => <span className="font-medium">{p.full_name}</span> },
    { id: 'phone', header: 'Phone', cell: (p) => (p.phone ? <span className="tabular-nums">{p.phone}</span> : dash) },
    { id: 'email', header: 'Email', cell: (p) => p.email || dash },
    { id: 'occupation', header: 'Occupation', mobile: 'hidden', cell: (p) => p.occupation || dash },
    { id: 'login', header: 'Portal', mobile: 'hidden', cell: (p) => (p.user ? 'Has login' : <span className="text-muted-foreground">No login</span>) },
  ]

  const addButton = (label: string) => (
    <PermissionGate permission={PERMS.parents.create}>
      <Button onClick={crud.openCreate}>
        <Plus aria-hidden /> {label}
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <PageHeader title="Parents" description="Parents and guardians, and the children they’re linked to." actions={addButton('Add parent')} />
      <DataTable
        ariaLabel="Parents"
        columns={columns}
        query={query}
        list={list}
        getRowId={(p) => p.id}
        onRowClick={(p) => navigate(`/parents/${p.id}`)}
        searchPlaceholder="Search by name, phone or email…"
        rowActions={(p) => (
          <RowActions
            actions={[
              { label: 'Open', icon: Eye, onSelect: () => navigate(`/parents/${p.id}`) },
              { label: 'Edit', icon: Pencil, permission: PERMS.parents.update, onSelect: () => crud.openEdit(p) },
              { label: 'Delete', icon: Trash2, permission: PERMS.parents.delete, destructive: true, onSelect: () => crud.openDelete(p) },
            ]}
          />
        )}
        empty={{
          title: 'No parents yet',
          description: 'Guardians are added automatically when an admission is enrolled. You can also add them here.',
          action: addButton('Add the first parent'),
        }}
      />
      <ParentFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} onCreated={(p) => navigate(`/parents/${p.id}`)} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={crud.deleting.full_name}
          description="They disappear from their children’s records. The students themselves are not affected."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Parent deleted.')
          }}
        />
      )}
    </>
  )
}
