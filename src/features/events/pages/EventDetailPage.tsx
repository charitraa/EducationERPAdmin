import { Ban, Check, Pencil, Send, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMyStaffRecord } from '@/features/staff/hooks/useStaff'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { Event, Registration } from '../api/events.api'
import { EventFormDialog } from '../components/EventFormDialog'
import { EventRoster } from '../components/EventRoster'
import { useCancelEvent, useDecideRegistration, useEvent, useEventRegistrations, usePublishEvent, useRemoveEvent } from '../hooks/useEvents'
import { eventBadge } from './EventsListPage'
import { tr } from '@/lib/i18n'

function Banner({ tone, children }: { tone: 'info' | 'warning' | 'danger'; children: ReactNode }) {
  const cls = { info: 'border-info/20 bg-info-soft', warning: 'border-warning/25 bg-warning-soft', danger: 'border-danger/20 bg-danger-soft' }[tone]
  return <div className={`mb-5 rounded-lg border p-3 text-sm ${cls}`}>{children}</div>
}

/** Approval events: who's waiting, with approve / reject (a reason is required to reject). */
function PendingRegistrations({ event, canRun }: { event: Event; canRun: boolean }) {
  const regs = useEventRegistrations(event.id)
  const decide = useDecideRegistration()
  const [approving, setApproving] = useState<Registration | null>(null)
  const [rejecting, setRejecting] = useState<Registration | null>(null)
  const pending = (regs.data ?? []).filter((r) => r.status === 'pending')
  if (event.registration_mode !== 'approval' || pending.length === 0) return null

  return (
    <section className="mb-5 rounded-lg border border-warning/25 bg-card">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">
        {tr('{count} waiting for approval', { count: pending.length })}
        {event.capacity != null && <span className="font-normal text-muted-foreground"> {'· ' + tr('{max} places left', { max: Math.max(event.capacity - event.confirmed_count, 0) })}</span>}
      </h2>
      <ul className="divide-y">
        {pending.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.student_name}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{r.student_number}</span>
                {tr('{value} · applied {dateTime}', { value: r.note ? ` · “${r.note}”` : '', dateTime: formatDateTime(r.created_at) })}
              </p>
            </div>
            {canRun && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setApproving(r)}>
                  <Check aria-hidden /> {tr('Approve')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>
                  <X aria-hidden /> {tr('Reject')}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(o) => !o && setApproving(null)}
        title={tr('Approve {student_name}?', { student_name: approving?.student_name })}
        description={tr('They get a confirmed place and are told so.')}
        confirmLabel={tr('Approve')}
        onConfirm={async () => {
          await decide.mutateAsync({ id: approving!.id, approve: true, note: '' })
          toast.success(tr('Approved.'))
        }}
      />
      <FormDialog
        open={rejecting !== null}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={tr('Reject {student_name}?', { student_name: rejecting?.student_name })}
        submitLabel={tr('Reject')}
        schema={z.object({ note: z.string().trim().min(1, tr('Say why; the student sees it.')).max(255) })}
        defaultValues={{ note: '' }}
        onSubmit={async (v) => {
          await decide.mutateAsync({ id: rejecting!.id, approve: false, note: v.note })
          toast.success(tr('Rejected.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.note?.message}>
            <Textarea {...register('note')} rows={2} maxLength={255} autoFocus />
          </FormField>
        )}
      </FormDialog>
    </section>
  )
}

export default function EventDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const event = useEvent(id)
  const { can } = usePermissions()
  const me = useMyStaffRecord()
  const { isMultiBranch, branchName } = useBranches()
  const publish = usePublishEvent()
  const cancel = useCancelEvent()
  const remove = useRemoveEvent()
  const [dialog, setDialog] = useState<'edit' | 'publish' | 'cancel' | 'delete' | null>(null)

  if (event.isPending) return <PageLoader />
  if (event.isError) return <ErrorState error={event.error} onRetry={() => void event.refetch()} />
  const e = event.data
  const manage = can(PERMS.events.manage)
  // The backend's can_run: the office (manage), or a coordinator who organizes this event.
  const canRun = manage || (can(PERMS.events.coordinate) && me.data != null && me.data.id === e.organized_by)
  const badge = eventBadge(e)
  const close = (o: boolean) => !o && setDialog(null)

  return (
    <>
      <PageHeader
        backTo="/events"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {e.name}
            <StatusBadge status={badge.status} label={badge.label} />
          </span>
        }
        description={[
          `${formatDateTime(e.start_at)} – ${formatDateTime(e.end_at)}`,
          e.venue,
          e.category_name,
          isMultiBranch ? (e.campus ? branchName(e.campus) : tr('All branches')) : null,
          e.organized_by_name ? tr('Organized by {organized_by_name}', { organized_by_name: e.organized_by_name }) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          manage && (
            <>
              {e.status === 'draft' && (
                <Button size="sm" onClick={() => setDialog('publish')}>
                  <Send aria-hidden /> {tr('Publish')}
                </Button>
              )}
              {e.status !== 'cancelled' && (
                <Button size="sm" variant="outline" onClick={() => setDialog('edit')}>
                  <Pencil aria-hidden /> {tr('Edit')}
                </Button>
              )}
              <RowActions
                label={tr('More actions')}
                actions={[
                  { label: tr('Cancel event'), icon: Ban, destructive: true, hidden: e.status === 'cancelled', onSelect: () => setDialog('cancel') },
                  { label: tr('Delete'), icon: Trash2, destructive: true, hidden: e.status !== 'draft', onSelect: () => setDialog('delete') },
                ]}
              />
            </>
          )
        }
      />

      {e.status === 'draft' && <Banner tone="warning">{tr('Being set up: students can’t see it yet. Publish it when the details are final.')}</Banner>}
      {e.status === 'cancelled' && (
        <Banner tone="danger">
          {tr('Cancelled {value}', { value: e.cancelled_at ? formatDateTime(e.cancelled_at) : '' })}
          {e.cancelled_reason ? `: “${e.cancelled_reason}”` : ''}
        </Banner>
      )}
      {e.status === 'published' && !e.is_over && e.registration_mode !== 'none' && (
        <Banner tone="info">
          {enumLabel('RegistrationModeEnum', e.registration_mode)}{tr('. {confirmed_count} confirmed', { confirmed_count: e.confirmed_count })}{e.capacity != null ? ' ' + tr('of {capacity} places', { capacity: e.capacity }) : ''}.{' '}
          {e.registration_open ? (e.registration_deadline ? tr('Sign-up closes {dateTime}.', { dateTime: formatDateTime(e.registration_deadline) }) : tr('Sign-up is open until it starts.')) : tr('Sign-up is closed.')}
        </Banner>
      )}
      {e.description && <p className="mb-5 max-w-3xl whitespace-pre-wrap text-sm">{e.description}</p>}

      <PendingRegistrations event={e} canRun={canRun} />
      <EventRoster event={e} canRun={canRun} />

      <EventFormDialog open={dialog === 'edit'} onOpenChange={close} record={e} />
      <ConfirmDialog
        open={dialog === 'publish'}
        onOpenChange={close}
        title={tr('Publish this event?')}
        description={e.registration_mode === 'none' ? tr('Students and parents can see it.') : tr('Students can see it and sign up.')}
        confirmLabel={tr('Publish')}
        onConfirm={async () => {
          await publish.mutateAsync(e.id)
          toast.success(tr('Event published.'))
        }}
      />
      <FormDialog
        open={dialog === 'cancel'}
        onOpenChange={close}
        title={tr('Cancel {name}?', { name: e.name })}
        description={tr('Everyone signed up sees the reason. The event stays on record; this can’t be undone.')}
        submitLabel={tr('Cancel event')}
        schema={z.object({ reason: z.string().trim().min(1, tr('Say why it’s cancelled.')).max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await cancel.mutateAsync({ id: e.id, reason: v.reason })
          toast.success(tr('Event cancelled.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.reason?.message}>
            <Textarea {...register('reason')} rows={2} maxLength={255} autoFocus />
          </FormField>
        )}
      </FormDialog>
      <DeleteDialog
        open={dialog === 'delete'}
        onOpenChange={close}
        subject={e.name}
        onConfirm={async () => {
          await remove.mutateAsync(e.id)
          toast.success(tr('Event deleted.'))
          navigate('/events', { replace: true })
        }}
      />
    </>
  )
}
