import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Pagination } from '@/components/ui/Pagination'
import { PermissionGate } from '@/components/common/PermissionGate'
import type { Parent } from '@/lib/api/parents'
import { useParents } from './hooks'
import { ParentFormDialog } from './ParentFormDialog'

export function ParentsListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useParents({ page, search: search || undefined })

  const columns: Column<Parent>[] = [
    { header: 'Name', cell: (p) => <span className="font-medium">{p.full_name}</span> },
    { header: 'Phone', cell: (p) => p.phone || '—' },
    { header: 'Email', cell: (p) => p.email || '—' },
    { header: 'Occupation', cell: (p) => p.occupation || '—' },
  ]

  return (
    <div>
      <PageHeader
        title="Parents"
        description="Guardians linked to one or more students."
        actions={
          <PermissionGate any={['parents.create']}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New parent
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-border-soft p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search parents…"
              className="pl-8"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={data?.results ?? []}
          loading={isLoading}
          keyFor={(p) => p.id}
          onRowClick={(p) => navigate(`/parents/${p.id}`)}
          emptyTitle="No parents found"
        />

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} count={data.count} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>

      <ParentFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
