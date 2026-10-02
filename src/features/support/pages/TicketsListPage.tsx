import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useListState } from '@/hooks/usePagination'
import { usePermissions } from '@/hooks/usePermissions'
import { formatRelative } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { Ticket } from '../api/support.api'
import { RaiseTicketDialog } from '../components/RaiseTicketDialog'
import { useTickets } from '../hooks/useSupport'

export default function TicketsListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { can } = usePermissions()
  const office = can(PERMS.support.manage)
  const { isMultiBranch, branches } = useBranches()
  const list = useListState({ filters: ['status', 'assigned_to', 'campus'] })
  const query = useTickets(list.query)
  const [raising, setRaising] = useState(false)

  const columns: Column<Ticket>[] = [
    { id: 'id', header: '#', className: 'w-14 tabular-nums text-muted-foreground', mobile: 'hidden', cell: (t) => t.id },
    { id: 'subject', header: 'Subject', mobile: 'title', cell: (t) => <span className="font-medium">{t.subject}</span> },
    { id: 'by', header: 'Raised by', cell: (t) => (t.raised_by === user?.id ? 'You' : t.raised_by_name || '—') },
    { id: 'assignee', header: 'Assigned to', cell: (t) => (t.assigned_to === user?.id ? 'You' : t.assigned_to_name || <span className="text-muted-foreground">Nobody yet</span>) },
    { id: 'campus', header: 'Branch', hidden: !isMultiBranch, cell: (t) => t.campus_name ?? '—' },
    { id: 'updated', header: 'Updated', mobile: 'hidden', cell: (t) => formatRelative(t.updated_at) },
    { id: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status ?? 'open'} label={enumLabel('SupportTicketStatusEnum', t.status)} /> },
  ]

  return (
    <>
      <PageHeader
        title="Support"
        description={office ? 'Requests from students, parents and staff. Assign, resolve, close.' : 'Your requests to the school office.'}
        actions={
          <Button onClick={() => setRaising(true)}>
            <Plus aria-hidden /> Raise a ticket
          </Button>
        }
      />
      <DataTable
        ariaLabel="Tickets"
        columns={columns}
        query={query}
        list={list}
        getRowId={(t) => t.id}
        onRowClick={(t) => navigate(`/support/tickets/${t.id}`)}
        searchable={false}
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('SupportTicketStatusEnum') },
          { name: 'assigned_to', label: 'Assigned to', hidden: !office || !user, options: user ? [{ value: String(user.id), label: 'Me' }] : [] },
          { name: 'campus', label: 'Branch', hidden: !isMultiBranch || !office, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        empty={{ title: 'No tickets', description: 'When something needs the office’s attention, raise a ticket.', action: <Button onClick={() => setRaising(true)}>Raise a ticket</Button> }}
      />
      <RaiseTicketDialog open={raising} onOpenChange={setRaising} onRaised={(t) => navigate(`/support/tickets/${t.id}`)} />
    </>
  )
}
