import { useState } from 'react'
import { Plus, Search, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Pagination } from '@/components/ui/Pagination'
import { PermissionGate } from '@/components/PermissionGate'
import type { Role } from '@/lib/api/roles'
import { useRoles } from './hooks'
import { RoleFormDialog } from './RoleFormDialog'

export function RolesListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dialogRole, setDialogRole] = useState<Role | null | undefined>(undefined)

  const { data, isLoading } = useRoles({ page, search: search || undefined })

  const columns: Column<Role>[] = [
    {
      header: 'Role',
      cell: (r) => (
        <div className="flex items-center gap-2">
          {r.is_system && <ShieldCheck className="size-3.5 text-accent" />}
          <span className="font-medium">{r.name}</span>
        </div>
      ),
    },
    { header: 'Code', cell: (r) => r.code },
    { header: 'Permissions', cell: (r) => r.permissions.length },
    { header: 'Assigned users', cell: (r) => r.assigned_user_count },
    { header: 'Scope', cell: (r) => <Badge tone={r.is_system ? 'accent' : 'neutral'}>{r.is_system ? 'System' : 'Organization'}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Bundles of permissions you can assign to users, org-wide or per campus."
        actions={
          <PermissionGate any={['roles.create']}>
            <Button onClick={() => setDialogRole(null)}>
              <Plus className="size-4" /> New role
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-border-soft p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search roles…"
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
          keyFor={(r) => r.id}
          onRowClick={(r) => setDialogRole(r)}
          emptyTitle="No roles found"
        />

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} count={data.count} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>

      <RoleFormDialog open={dialogRole !== undefined} onClose={() => setDialogRole(undefined)} role={dialogRole} />
    </div>
  )
}
