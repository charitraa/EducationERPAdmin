import { useState } from 'react'
import { MapPin, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Pagination } from '@/components/ui/Pagination'
import { PermissionGate } from '@/components/common/PermissionGate'
import { useAuthStore } from '@/stores/auth-store'
import type { Campus } from '@/lib/api/campuses'
import { useCampuses } from './hooks'
import { CampusFormDialog } from './CampusFormDialog'

export function CampusesListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dialogCampus, setDialogCampus] = useState<Campus | null | undefined>(undefined)
  const canEdit = useAuthStore((s) => s.hasPermission('campuses.update'))

  const { data, isLoading } = useCampuses({ page, search: search || undefined })

  const columns: Column<Campus>[] = [
    {
      header: 'Name',
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{c.name}</span>
          {c.is_main && <Badge tone="accent">Main</Badge>}
        </div>
      ),
    },
    { header: 'Code', cell: (c) => c.code },
    {
      header: 'Location',
      cell: (c) =>
        c.city ? (
          <span className="flex items-center gap-1 text-text-muted">
            <MapPin className="size-3.5" /> {c.city}
            {c.country ? `, ${c.country}` : ''}
          </span>
        ) : (
          '—'
        ),
    },
    { header: 'Status', cell: (c) => <Badge tone={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title="Campuses"
        description="Branches and physical locations within your organization."
        actions={
          <PermissionGate any={['campuses.create']}>
            <Button onClick={() => setDialogCampus(null)}>
              <Plus className="size-4" /> New campus
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-border-soft p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search campuses…"
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
          keyFor={(c) => c.id}
          onRowClick={canEdit ? (c) => setDialogCampus(c) : undefined}
          emptyTitle="No campuses found"
        />

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} count={data.count} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>

      <CampusFormDialog open={dialogCampus !== undefined} onClose={() => setDialogCampus(undefined)} campus={dialogCampus} />
    </div>
  )
}
