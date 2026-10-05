import { Eye, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { formatRelative } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import { userTypeOptions, type User } from '../api/users.api'
import { UserFormDialog } from '../components/UserFormDialog'
import { useUsers } from '../hooks/useUsers'
import { tr, trc } from '@/lib/i18n'

export default function UsersListPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['user_type', 'is_active'], defaultOrdering: 'email' })
  const query = useUsers(list.query)
  const crud = useCrudState<User>()

  const columns: Column<User>[] = [
    {
      id: 'name',
      header: tr('Name'),
      sortField: 'email',
      mobile: 'title',
      cell: (u) => (
        <span className="grid">
          <span className="font-medium">{u.full_name || u.email}</span>
          {u.full_name && <span className="text-xs text-muted-foreground">{u.email}</span>}
        </span>
      ),
    },
    { id: 'type', header: tr('Type'), cell: (u) => enumLabel('UserTypeEnum', u.user_type) },
    {
      id: 'roles',
      header: tr('Roles'),
      cell: (u) =>
        u.role_assignments.length ? (
          <span className="flex flex-wrap gap-1">
            {u.role_assignments.map((a) => (
              <span key={a.id} className="rounded border bg-muted/50 px-1.5 py-0.5 text-xs">
                {tr(a.role_name)}
                {a.campus_name ? ` · ${a.campus_name}` : ''}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-xs text-warning">{tr('No role: can’t do anything')}</span>
        ),
    },
    { id: 'login', header: tr('Last sign-in'), mobile: 'hidden', cell: (u) => (u.last_login ? formatRelative(u.last_login) : <span className="text-muted-foreground">{tr('Never')}</span>) },
    { id: 'status', header: tr('Status'), cell: (u) => <StatusBadge status={u.is_active === false ? 'inactive' : 'active'} label={u.is_active === false ? tr('Deactivated') : tr('Active')} /> },
  ]

  const addButton = (label: string) => (
    <PermissionGate permission={PERMS.users.create}>
      <Button onClick={crud.openCreate}>
        <Plus aria-hidden /> {label}
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <PageHeader title={tr('Users')} description={tr('Who can sign in, and the roles that decide what they can do.')} actions={addButton(tr('Add user'))} />
      <DataTable
        ariaLabel={tr('Users')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(u) => u.id}
        onRowClick={(u) => navigate(`/users/${u.id}`)}
        searchPlaceholder={tr('Search by name, email or phone…')}
        filters={[
          { name: 'user_type', label: tr('Type'), options: userTypeOptions() },
          { name: 'is_active', label: tr('Status'), options: [{ value: 'true', label: tr('Active') }, { value: 'false', label: tr('Deactivated') }] },
        ]}
        rowActions={(u) => <RowActions actions={[{ label: trc('verb', 'Open'), icon: Eye, onSelect: () => navigate(`/users/${u.id}`) }]} />}
        empty={{ title: tr('No users found'), description: tr('Add accounts for staff who need to sign in.'), action: addButton(tr('Add user')) }}
      />
      <UserFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={null} onCreated={(u) => navigate(`/users/${u.id}`)} />
    </>
  )
}
