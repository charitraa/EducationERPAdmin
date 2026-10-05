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
import { tr } from '@/lib/i18n'

/** Status for the badge: drafts and cancellations as-is; published ones by whether they're over. */
export function eventBadge(e: Pick<Event, 'status' | 'is_over'>) {
  if (e.status === 'published') return e.is_over ? { status: 'completed', label: tr('Over') } : { status: 'published', label: tr('Published') }
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
    { id: 'name', header: tr('Event'), mobile: 'title', cell: (e) => <span className="font-medium">{e.name}</span> },
    { id: 'when', header: tr('When'), sortField: 'start_at', className: 'tabular-nums whitespace-nowrap', cell: (e) => formatDateTime(e.start_at) },
    { id: 'category', header: tr('Category'), cell: (e) => e.category_name },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (e) => (e.campus ? branches.find((b) => b.id === e.campus)?.name : tr('All branches')) },
    {
      id: 'signups',
      header: tr('Sign-ups'),
      mobile: 'hidden',
      cell: (e) =>
        e.registration_mode === 'none' ? (
          <span className="text-muted-foreground">{tr('No sign-up')}</span>
        ) : (
          <span className="tabular-nums">
            {e.confirmed_count}
            {e.capacity != null && <span className="text-muted-foreground"> / {e.capacity}</span>}
          </span>
        ),
    },
    {
      id: 'status',
      header: tr('Status'),
      cell: (e) => {
        const b = eventBadge(e)
        return <StatusBadge status={b.status} label={b.label} />
      },
    },
  ]

  const addButton = (label: string) => (
    <PermissionGate permission={PERMS.events.manage}>
      <Button onClick={() => setCreating(true)} disabled={categories.data?.length === 0} title={categories.data?.length === 0 ? tr('Add an event category first.') : undefined}>
        <Plus aria-hidden /> {label}
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <SectionHeader title={tr('All events')} action={addButton(tr('New event'))} />
      <DataTable
        ariaLabel={tr('Events')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(e) => e.id}
        onRowClick={(e) => navigate(`/events/${e.id}`)}
        searchPlaceholder={tr('Search by name or venue…')}
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('EventStatusEnum') },
          { name: 'category', label: tr('Category'), options: (categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })) },
          { name: 'campus', label: tr('Branch'), hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        empty={{
          title: tr('No events yet'),
          description: categories.data?.length === 0 ? tr('Start by adding a category (Sports, Cultural, Academic…) under Categories.') : tr('Create an event, publish it, then run sign-ups and check-in from its page.'),
          action: addButton(tr('Create the first event')),
        }}
      />
      <EventFormDialog open={creating} onOpenChange={setCreating} record={null} onCreated={(e) => navigate(`/events/${e.id}`)} />
    </>
  )
}
