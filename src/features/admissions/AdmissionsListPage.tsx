import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Pagination } from '@/components/ui/Pagination'
import { PermissionGate } from '@/components/common/PermissionGate'
import { useCampuses } from '@/features/campuses/hooks'
import { formatDate, titleCase } from '@/lib/utils'
import type { Admission, AdmissionStatus } from '@/lib/api/admissions'
import { useAdmissions } from './hooks'
import { AdmissionFormDialog } from './AdmissionFormDialog'

const STATUSES: AdmissionStatus[] = ['pending', 'approved', 'rejected', 'withdrawn', 'enrolled']

export function AdmissionsListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [campus, setCampus] = useState('')
  const [status, setStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: campuses } = useCampuses({ page_size: 200 })
  const { data, isLoading } = useAdmissions({
    page,
    search: search || undefined,
    campus: campus ? Number(campus) : undefined,
    status: (status || undefined) as AdmissionStatus | undefined,
  })

  const columns: Column<Admission>[] = [
    { header: 'Application #', cell: (a) => <span className="font-mono text-xs text-text-muted">{a.application_number}</span> },
    { header: 'Applicant', cell: (a) => <span className="font-medium">{a.full_name}</span> },
    { header: 'Applying for', cell: (a) => a.applying_for || '—' },
    { header: 'Campus', cell: (a) => a.campus_name },
    { header: 'Applied on', cell: (a) => formatDate(a.applied_on) },
    { header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Admissions"
        description="Applications working their way toward enrollment."
        actions={
          <PermissionGate any={['admissions.create']}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New application
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search by name or application #…"
              className="pl-8"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Select className="w-44" value={campus} onChange={(e) => { setCampus(e.target.value); setPage(1) }}>
            <option value="">All campuses</option>
            {campuses?.results.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select className="w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{titleCase(s)}</option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={data?.results ?? []}
          loading={isLoading}
          keyFor={(a) => a.id}
          onRowClick={(a) => navigate(`/admissions/${a.id}`)}
          emptyTitle="No admissions found"
        />

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} count={data.count} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>

      <AdmissionFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
