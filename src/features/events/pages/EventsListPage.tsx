import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PermissionGate } from '@/components/common/PermissionGate'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useListState } from '@/hooks/usePagination'
import { formatDateTime } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { Event } from '../api/events.api'
import { EventFormDialog } from '../components/EventFormDialog'
import { useCategoryOptions, useEvents } from '../hooks/useEvents'

/** Status for the badge: drafts and cancellations as-is; published ones by whether they're over. */
export function eventBadge(e: Pick<Event, 'status' | 'is_over'>) {
  if (e.status === 'published') return e.is_over ? { status: 'completed', label: 'Over' } : { status: 'published', label: 'Published' }
  return { status: e.status === 'draft' ? 'draft' : 'cancelled', label: enumLabel('EventStatusEnum', e.status) }
}

export default function EventsListPage() {
  const navigate = useNavigate()
  const { isMultiBranch, branches } = useBranches()
  const categories = useCategoryOptions()
  const list = useListState({ filters: ['status', 'category', 'campus', 'date_from', 'date_to'], defaultOrdering: '-start_at' })
  const query = useEvents(list.query)
  const [creating, setCreating] = useState(false)

  const columns: Column<Event>[] = [
    { id: 'name', header: 'Event', mobile: 'title', cell: (e) => <span className="font-medium">{e.name}</span> },
    { id: 'when', header: 'When', sortField: 'start_at', className: 'tabular-nums whitespace-nowrap', cell: (e) => formatDateTime(e.start_at) },
    { id: 'category', header: 'Category', cell: (e) => e.category_name },
    { id: 'campus', header: 'Branch', hidden: !isMultiBranch, cell: (e) => (e.campus ? branches.find((b) => b.id === e.campus)?.name : 'All branches') },
    {
      id: 'signups',
      header: 'Sign-ups',
      mobile: 'hidden',
      cell: (e) =>
        e.registration_mode === 'none' ? (
          <span className="text-muted-foreground">No sign-up</span>
        ) : (
          <span className="tabular-nums">
            {e.confirmed_count}
            {e.capacity != null && <span className="text-muted-foreground"> / {e.capacity}</span>}
          </span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (e) => {
        const b = eventBadge(e)
        return <StatusBadge status={b.status} label={b.label} />
      },
    },
  ]

  const addButton = (label: string) => (
    <PermissionGate permission={PERMS.events.manage}>
      <Button onClick={() => setCreating(true)} disabled={categories.data?.length === 0} title={categories.data?.length === 0 ? 'Add an event category first.' : undefined}>
        <Plus aria-hidden /> {label}
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <SectionHeader title="All events" action={addButton('New event')} />
      <DataTable
        ariaLabel="Events"
        columns={columns}
        query={query}
        list={list}
        getRowId={(e) => e.id}
        onRowClick={(e) => navigate(`/events/${e.id}`)}
        searchPlaceholder="Search by name or venue…"
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('EventStatusEnum') },
          { name: 'category', label: 'Category', options: (categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })) },
          { name: 'campus', label: 'Branch', hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        empty={{
          title: 'No events yet',
          description: categories.data?.length === 0 ? 'Start by adding a category (Sports, Cultural, Academic…) under Categories.' : 'Create an event, publish it, then run sign-ups and check-in from its page.',
          action: addButton('Create the first event'),
        }}
      />
      <EventFormDialog open={creating} onOpenChange={setCreating} record={null} onCreated={(e) => navigate(`/events/${e.id}`)} />
    </>
  )
}
