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
import { PermissionGate } from '@/components/PermissionGate'
import { useCampuses } from '@/features/campuses/hooks'
import { formatDate, titleCase } from '@/lib/utils'
import type { Gender, Student, StudentStatus } from '@/lib/api/students'
import { useStudents } from './hooks'
import { StudentFormDialog } from './StudentFormDialog'

const STATUSES: StudentStatus[] = ['active', 'suspended', 'graduated', 'withdrawn']
const GENDERS: Gender[] = ['male', 'female', 'other', 'undisclosed']

export function StudentsListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [campus, setCampus] = useState('')
  const [status, setStatus] = useState('')
  const [gender, setGender] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: campuses } = useCampuses({ page_size: 200 })
  const { data, isLoading } = useStudents({
    page,
    search: search || undefined,
    campus: campus ? Number(campus) : undefined,
    status: (status || undefined) as StudentStatus | undefined,
    gender: (gender || undefined) as Gender | undefined,
  })

  const columns: Column<Student>[] = [
    { header: 'Student #', cell: (s) => <span className="font-mono text-xs text-text-muted">{s.student_number}</span> },
    { header: 'Name', cell: (s) => <span className="font-medium">{s.full_name}</span> },
    { header: 'Campus', cell: (s) => s.campus_name },
    { header: 'Gender', cell: (s) => titleCase(s.gender) },
    { header: 'Admitted', cell: (s) => formatDate(s.admitted_on) },
    { header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Students"
        description="Every learner enrolled across your campuses."
        actions={
          <PermissionGate any={['students.create']}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New student
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search by name or student #…"
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
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
          <Select className="w-36" value={gender} onChange={(e) => { setGender(e.target.value); setPage(1) }}>
            <option value="">All genders</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{titleCase(g)}</option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          rows={data?.results ?? []}
          loading={isLoading}
          keyFor={(s) => s.id}
          onRowClick={(s) => navigate(`/students/${s.id}`)}
          emptyTitle="No students found"
        />

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} count={data.count} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>

      <StudentFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
