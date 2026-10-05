import { Ban, Check, CheckCheck, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useMyStaffRecord } from '@/features/staff/hooks/useStaff'
import { useListState } from '@/hooks/usePagination'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { Appointment, Slot } from '../api/communication.api'
import { BookSlotDialog, PublishSlotDialog } from '../components/SlotDialogs'
import {
  useAppointments,
  useApproveAppointment,
  useCancelAppointment,
  useCancelSlot,
  useCompleteAppointment,
  useRemoveSlot,
  useSlots,
} from '../hooks/useCommunication'
import { tr } from '@/lib/i18n'

const timeRange = (start: string, end: string) => `${formatDateTime(start)}–${formatDateTime(end).slice(-5)}`
const dash = <span className="text-muted-foreground">—</span>

function AppointmentsTab() {
  const list = useListState({ filters: ['status'] })
  const query = useAppointments(list.query)
  const approve = useApproveAppointment()
  const complete = useCompleteAppointment()
  const cancel = useCancelAppointment()
  const [acting, setActing] = useState<{ a: Appointment; action: 'approve' | 'complete' | 'cancel' } | null>(null)

  const columns: Column<Appointment>[] = [
    { id: 'when', header: tr('When'), mobile: 'title', className: 'tabular-nums', cell: (a) => <span className="font-medium">{timeRange(a.starts_at, a.ends_at)}</span> },
    { id: 'with', header: tr('With'), cell: (a) => a.staff_name || dash },
    { id: 'by', header: tr('Booked by'), cell: (a) => a.requested_by_name || dash },
    { id: 'student', header: tr('About'), cell: (a) => a.student_name ?? dash },
    { id: 'reason', header: tr('Reason'), mobile: 'hidden', className: 'max-w-xs truncate', cell: (a) => a.reason || dash },
    { id: 'status', header: tr('Status'), cell: (a) => <StatusBadge status={a.status === 'confirmed' ? 'approved' : (a.status ?? 'pending')} label={enumLabel('AppointmentStatusEnum', a.status)} /> },
  ]

  return (
    <>
      <DataTable
        ariaLabel={tr('Appointments')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(a) => a.id}
        searchable={false}
        filters={[{ name: 'status', label: tr('Status'), options: enumOptions('AppointmentStatusEnum') }]}
        rowActions={(a) => (
          <RowActions
            actions={[
              { label: tr('Approve'), icon: Check, hidden: a.status !== 'pending', onSelect: () => setActing({ a, action: 'approve' }) },
              { label: tr('Mark as held'), icon: CheckCheck, hidden: a.status !== 'confirmed', onSelect: () => setActing({ a, action: 'complete' }) },
              { label: tr('Cancel'), icon: X, destructive: true, hidden: a.status === 'cancelled' || a.status === 'completed', onSelect: () => setActing({ a, action: 'cancel' }) },
            ]}
          />
        )}
        empty={{ title: tr('No appointments'), description: tr('Bookings on your published slots appear here.') }}
      />
      <ConfirmDialog
        open={acting?.action === 'approve'}
        onOpenChange={(o) => !o && setActing(null)}
        title={tr('Approve this appointment?')}
        description={acting ? tr('{requested_by_name} is told it’s confirmed for {timeRange}.', { requested_by_name: acting.a.requested_by_name, timeRange: timeRange(acting.a.starts_at, acting.a.ends_at) }) : undefined}
        confirmLabel={tr('Approve')}
        onConfirm={async () => {
          await approve.mutateAsync(acting!.a.id)
          toast.success(tr('Appointment confirmed.'))
        }}
      />
      <ConfirmDialog
        open={acting?.action === 'complete'}
        onOpenChange={(o) => !o && setActing(null)}
        title={tr('Mark this meeting as held?')}
        confirmLabel={tr('Mark as held')}
        onConfirm={async () => {
          await complete.mutateAsync(acting!.a.id)
          toast.success(tr('Marked as held.'))
        }}
      />
      <FormDialog
        open={acting?.action === 'cancel'}
        onOpenChange={(o) => !o && setActing(null)}
        title={tr('Cancel this appointment?')}
        description={tr('The person who booked it sees your reason.')}
        submitLabel={tr('Cancel appointment')}
        schema={z.object({ reason: z.string().trim().min(1, tr('Say why it’s being cancelled.')).max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await cancel.mutateAsync({ id: acting!.a.id, reason: v.reason })
          toast.success(tr('Appointment cancelled.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.reason?.message}>
            <Textarea {...register('reason')} rows={2} maxLength={255} autoFocus />
          </FormField>
        )}
      </FormDialog>
    </>
  )
}

function SlotsTab() {
  const list = useListState({ filters: ['is_cancelled'] })
  const query = useSlots(list.query)
  const staff = useMyStaffRecord()
  const { can } = usePermissions()
  const office = can(PERMS.communication.manageSlots)
  const cancel = useCancelSlot()
  const remove = useRemoveSlot()
  const [publishing, setPublishing] = useState(false)
  const [booking, setBooking] = useState<Slot | null>(null)
  const [cancelling, setCancelling] = useState<Slot | null>(null)
  const [deleting, setDeleting] = useState<Slot | null>(null)
  const mayPublish = can(PERMS.communication.publishSlots) && (office || Boolean(staff.data))

  const columns: Column<Slot>[] = [
    { id: 'when', header: tr('When'), mobile: 'title', className: 'tabular-nums', cell: (s) => <span className="font-medium">{timeRange(s.starts_at, s.ends_at)}</span> },
    { id: 'staff', header: tr('With'), cell: (s) => s.staff_name || dash },
    { id: 'where', header: tr('Where'), cell: (s) => s.location || dash },
    {
      id: 'state',
      header: tr('Status'),
      cell: (s) =>
        s.is_cancelled ? <StatusBadge status="cancelled" label={tr('Cancelled')} /> : s.is_booked ? <StatusBadge status="filled" label={tr('Booked')} /> : <StatusBadge status="open" label={tr('Open')} />,
    },
  ]

  const publishButton = mayPublish ? (
    <Button onClick={() => setPublishing(true)}>
      <Plus aria-hidden /> {tr('Publish a slot')}
    </Button>
  ) : null

  return (
    <>
      <div className="mb-3 flex justify-end">{publishButton}</div>
      <DataTable
        ariaLabel={tr('Meeting slots')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(s) => s.id}
        searchable={false}
        filters={[{ name: 'is_cancelled', label: tr('Show'), options: [{ value: 'false', label: tr('Active') }, { value: 'true', label: tr('Cancelled') }] }]}
        rowActions={(s) => (
          <RowActions
            actions={[
              { label: tr('Book for a family'), icon: UserPlus, permission: PERMS.communication.manageSlots, hidden: s.is_cancelled || s.is_booked, onSelect: () => setBooking(s) },
              { label: tr('Cancel slot'), icon: Ban, destructive: true, hidden: s.is_cancelled, onSelect: () => setCancelling(s) },
              { label: tr('Delete'), icon: Trash2, destructive: true, hidden: s.is_booked, onSelect: () => setDeleting(s) },
            ]}
          />
        )}
        empty={{ title: tr('No slots'), description: tr('Publish times you’re free to meet parents; they book them from their portal.'), action: publishButton }}
      />
      <PublishSlotDialog open={publishing} onOpenChange={setPublishing} myStaffId={staff.data?.id ?? null} />
      <BookSlotDialog slot={booking} onClose={() => setBooking(null)} />
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
        tone="destructive"
        title={tr('Cancel this slot?')}
        description={cancelling?.is_booked ? tr('It’s booked: the booking is cancelled too.') : tr('Nobody can book it any more.')}
        confirmLabel={tr('Cancel slot')}
        onConfirm={async () => {
          await cancel.mutateAsync(cancelling!.id)
          toast.success(tr('Slot cancelled.'))
        }}
      />
      {deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          subject={tr('the slot on {dateTime}', { dateTime: formatDateTime(deleting.starts_at) })}
          onConfirm={async () => {
            await remove.mutateAsync(deleting.id)
            toast.success(tr('Slot deleted.'))
          }}
        />
      )}
    </>
  )
}

/** /messages/appointments: bookings to act on, and the slots they come from. */
export default function AppointmentsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'slots' ? 'slots' : 'appointments'
  return (
    <>
      <PageHeader backTo="/messages" title={tr('Appointments')} description={tr('Parent–teacher meetings: publish free slots, then approve what families book.')} />
      <Tabs value={tab} onValueChange={(t) => setParams(t === 'slots' ? { tab: 'slots' } : {}, { replace: true })}>
        <TabsList>
          <TabsTrigger value="appointments">{tr('Bookings')}</TabsTrigger>
          <TabsTrigger value="slots">{tr('Slots')}</TabsTrigger>
        </TabsList>
        <TabsContent value="appointments" className="mt-4">
          <AppointmentsTab />
        </TabsContent>
        <TabsContent value="slots" className="mt-4">
          <SlotsTab />
        </TabsContent>
      </Tabs>
    </>
  )
}
