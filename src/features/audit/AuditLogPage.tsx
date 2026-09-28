import { useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Pagination } from '@/components/ui/Pagination'
import { formatDateTime } from '@/lib/utils'
import type { AuditAction, AuditLog } from '@/lib/api/audit'
import { useAuditLogs } from './hooks'

const ACTIONS: AuditAction[] = [
  'create',
  'update',
  'delete',
  'login',
  'login_failed',
  'logout',
  'password_change',
  'permission_change',
  'export',
]

const ACTION_TONE: Record<AuditAction, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  login: 'success',
  login_failed: 'danger',
  logout: 'neutral',
  password_change: 'warning',
  permission_change: 'warning',
  export: 'info',
}

export function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<string>('')

  const { data, isLoading } = useAuditLogs({
    page,
    search: search || undefined,
    action: (action || undefined) as AuditAction | undefined,
  })

  const columns: Column<AuditLog>[] = [
    { header: 'When', cell: (l) => formatDateTime(l.created_at), className: 'whitespace-nowrap' },
    { header: 'Actor', cell: (l) => l.actor_name || l.actor_email || 'System' },
    { header: 'Action', cell: (l) => <Badge tone={ACTION_TONE[l.action]}>{l.action.replace(/_/g, ' ')}</Badge> },
    { header: 'Module', cell: (l) => <span className="capitalize">{l.module}</span> },
    { header: 'Object', cell: (l) => l.object_repr || `${l.object_type} #${l.object_id}` },
  ]

  return (
    <div>
      <PageHeader title="Audit log" description="A record of important actions taken across the platform." />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search by actor, object…"
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            className="w-44"
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>

        <DataTable columns={columns} rows={data?.results ?? []} loading={isLoading} keyFor={(l) => l.id} emptyTitle="No activity found" />

        {data && (
          <Pagination page={data.page} totalPages={data.total_pages} count={data.count} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>
    </div>
  )
}
