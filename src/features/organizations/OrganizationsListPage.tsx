import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Pagination } from '@/components/ui/Pagination'
import { useAuthStore } from '@/stores/auth-store'
import type { Organization } from '@/lib/api/organizations'
import { useOrganizations } from './hooks'
import { OrganizationFormDialog } from './OrganizationFormDialog'

export function OrganizationsListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dialogOrg, setDialogOrg] = useState<Organization | null | undefined>(undefined)
  const isSuperuser = useAuthStore((s) => s.user?.is_superuser)
  const canEdit = useAuthStore((s) => s.hasPermission('organizations.update'))

  const { data, isLoading } = useOrganizations({ page, search: search || undefined })

  const columns: Column<Organization>[] = [
    { header: 'Name', cell: (o) => <span className="font-medium">{o.name}</span> },
    { header: 'Code', cell: (o) => o.code },
    { header: 'Type', cell: (o) => <span className="capitalize">{o.type}</span> },
    { header: 'Campuses', cell: (o) => o.campus_count },
    { header: 'Status', cell: (o) => <Badge tone={o.is_active ? 'success' : 'neutral'}>{o.is_active ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Institutions using this platform."
        actions={
          isSuperuser && (
            <Button onClick={() => setDialogOrg(null)}>
              <Plus className="size-4" /> New organization
            </Button>
          )
        }
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-border-soft p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search organizations…"
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
          keyFor={(o) => o.id}
          onRowClick={canEdit ? (o) => setDialogOrg(o) : undefined}
          emptyTitle="No organizations found"
        />

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} count={data.count} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>

      <OrganizationFormDialog
        open={dialogOrg !== undefined}
        onClose={() => setDialogOrg(undefined)}
        organization={dialogOrg}
      />
    </div>
  )
}
