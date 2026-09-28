import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Pagination } from '@/components/ui/Pagination'
import { PermissionGate } from '@/components/common/PermissionGate'
import { titleCase } from '@/lib/utils'
import type { User } from '@/lib/api/users'
import { useUsers } from './hooks'
import { UserFormDialog } from './UserFormDialog'

export function UsersListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useUsers({ page, search: search || undefined })

  const columns: Column<User>[] = [
    { header: 'Name', cell: (u) => <span className="font-medium">{u.full_name}</span> },
    { header: 'Email', cell: (u) => u.email },
    { header: 'Type', cell: (u) => titleCase(u.user_type) },
    { header: 'Roles', cell: (u) => u.role_assignments.length },
    { header: 'Status', cell: (u) => <Badge tone={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="Users"
        description="Everyone with login access, and the roles they hold."
        actions={
          <PermissionGate any={['users.create']}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New user
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-border-soft p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search users…"
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={data?.results ?? []}
          loading={isLoading}
          keyFor={(u) => u.id}
          onRowClick={(u) => navigate(`/users/${u.id}`)}
          emptyTitle="No users found"
        />

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} count={data.count} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>

      <UserFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
