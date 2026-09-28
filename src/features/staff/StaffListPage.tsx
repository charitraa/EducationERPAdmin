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
import { titleCase } from '@/lib/utils'
import type { StaffMember, StaffStatus, StaffType } from '@/lib/api/staff'
import { useStaffMembers } from './hooks'
import { StaffFormDialog } from './StaffFormDialog'

const STAFF_TYPES: StaffType[] = ['teaching', 'non_teaching']
const STATUSES: StaffStatus[] = ['active', 'on_leave', 'left']

export function StaffListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [campus, setCampus] = useState('')
  const [staffType, setStaffType] = useState('')
  const [status, setStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: campuses } = useCampuses({ page_size: 200 })
  const { data, isLoading } = useStaffMembers({
    page,
    search: search || undefined,
    campus: campus ? Number(campus) : undefined,
    staff_type: (staffType || undefined) as StaffType | undefined,
    status: (status || undefined) as StaffStatus | undefined,
  })

  const columns: Column<StaffMember>[] = [
    { header: 'Employee #', cell: (s) => <span className="font-mono text-xs text-text-muted">{s.employee_number}</span> },
    { header: 'Name', cell: (s) => <span className="font-medium">{s.full_name}</span> },
    { header: 'Campus', cell: (s) => s.campus_name },
    { header: 'Type', cell: (s) => titleCase(s.staff_type) },
    { header: 'Designation', cell: (s) => s.designation || '—' },
    { header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Teaching and non-teaching employees across your campuses."
        actions={
          <PermissionGate any={['staff.create']}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New staff member
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search by name or employee #…"
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
          <Select className="w-40" value={staffType} onChange={(e) => { setStaffType(e.target.value); setPage(1) }}>
            <option value="">All types</option>
            {STAFF_TYPES.map((t) => (
              <option key={t} value={t}>{titleCase(t)}</option>
            ))}
          </Select>
          <Select className="w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
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
          keyFor={(s) => s.id}
          onRowClick={(s) => navigate(`/staff/${s.id}`)}
          emptyTitle="No staff members found"
        />

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} count={data.count} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>

      <StaffFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
