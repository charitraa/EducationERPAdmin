import { Lock, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { Button } from '@/components/ui/button'
import { useListState } from '@/hooks/usePagination'
import { pluralize } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { Role } from '../api/roles.api'
import { useRoles } from '../hooks/useRoles'
import { tr } from '@/lib/i18n'

export default function RolesListPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['is_system'], defaultOrdering: 'name' })
  const query = useRoles(list.query)

  const columns: Column<Role>[] = [
    {
      id: 'name',
      header: tr('Role'),
      sortField: 'name',
      mobile: 'title',
      cell: (r) => (
        <span className="grid">
          <span className="flex items-center gap-1.5 font-medium">
            {tr(r.name)}
            {r.is_system && <Lock className="h-3 w-3 text-muted-foreground" aria-label={tr('Built-in')} />}
          </span>
          {r.description && <span className="line-clamp-1 text-xs text-muted-foreground">{tr(r.description)}</span>}
        </span>
      ),
    },
    { id: 'kind', header: tr('Kind'), cell: (r) => (r.is_system ? tr('Built-in') : tr('Your school’s')) },
    { id: 'perms', header: tr('Permissions'), cell: (r) => pluralize(r.permissions?.length ?? 0, 'permission') },
    { id: 'users', header: tr('Held by'), cell: (r) => pluralize(r.assigned_user_count ?? 0, 'person', 'people') },
  ]

  const addButton = (
    <PermissionGate permission={PERMS.roles.create}>
      <Button asChild>
        <Link to="/roles/new">
          <Plus aria-hidden /> {tr('New role')}
        </Link>
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <PageHeader title={tr('Roles')} description={tr('Named sets of permissions. A user can do something only if one of their roles allows it.')} actions={addButton} />
      <DataTable
        ariaLabel={tr('Roles')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate(`/roles/${r.id}`)}
        searchPlaceholder={tr('Search roles…')}
        filters={[{ name: 'is_system', label: tr('Kind'), options: [{ value: 'true', label: tr('Built-in') }, { value: 'false', label: tr('Your school’s') }] }]}
        empty={{ title: tr('No roles found'), action: addButton }}
      />
    </>
  )
}
