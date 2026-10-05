import { BookDown, Clock, HandCoins, PackageCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Money } from '@/features/finance/components/money'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Fine, Loan, Reservation } from '../api/library.api'
import { useCancelReservation, useExpireReservations, useFines, useFulfilReservation, useLoans, usePayFine, useReservations, useReturnBook, useWaiveFine } from '../hooks/useLibrary'
import { tr } from '@/lib/i18n'

const day = (iso: string | null | undefined) => (iso ? formatDate(iso.slice(0, 10)) : '—')

function ReasonDialog({ open, title, label, submitLabel, onClose, onSubmit }: { open: boolean; title: string; label: string; submitLabel: string; onClose: () => void; onSubmit: (reason: string) => Promise<unknown> }) {
  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      submitLabel={submitLabel}
      schema={z.object({ reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
      defaultValues={{ reason: '' }}
      onSubmit={(v) => onSubmit(v.reason)}
    >
      {({ register, formState: { errors } }) => (
        <FormField label={label} required error={errors.reason?.message}>
          <Input {...register('reason')} maxLength={255} />
        </FormField>
      )}
    </FormDialog>
  )
}

/** Every loan, current and past. Filter to one member from the Members page. */
export function LoansPage() {
  const list = useListState({ filters: ['status', 'member'] })
  const query = useLoans(list.query)
  const ret = useReturnBook()
  const [returning, setReturning] = useState<{ loan: Loan; outcome: 'returned' | 'damaged' | 'lost' } | null>(null)
  const columns: Column<Loan>[] = [
    {
      id: 'book',
      header: tr('Book'),
      mobile: 'title',
      cell: (l) => (
        <span>
          <span className="font-medium">{l.book_title}</span> <span className="font-mono text-xs text-muted-foreground">{l.accession_number}</span>
        </span>
      ),
    },
    { id: 'member', header: tr('Member'), cell: (l) => `${l.member_name} (${l.member_number})` },
    { id: 'issued', header: tr('Issued'), className: 'tabular-nums', cell: (l) => day(l.issued_at) },
    { id: 'due', header: tr('Due'), className: 'tabular-nums', cell: (l) => <span className={l.is_overdue ? 'font-medium text-danger' : undefined}>{day(l.due_at)}</span> },
    { id: 'returned', header: tr('Back'), mobile: 'hidden', className: 'tabular-nums', cell: (l) => day(l.returned_at) },
    {
      id: 'status',
      header: tr('Status'),
      cell: (l) =>
        l.is_overdue ? <StatusBadge status="rejected" tone="danger" label={tr('Overdue')} /> : <StatusBadge status={l.status === 'issued' ? 'open' : l.status === 'lost' ? 'rejected' : 'completed'} label={enumLabel('IssueStatusEnum', l.status)} />,
    },
  ]
  return (
    <>
      {list.filters.member && (
        <p className="mb-3 text-sm">
          {tr('One member’s loans.')}{' '}
          <button type="button" className="underline" onClick={() => list.setFilter('member', undefined)}>
            {tr('Show everyone’s')}
          </button>
        </p>
      )}
      <DataTable
        ariaLabel={tr('Loans')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(l) => l.id}
        searchPlaceholder={tr('Accession no., title or member no.…')}
        filters={[{ name: 'status', label: tr('Status'), options: enumOptions('IssueStatusEnum') }]}
        rowActions={(l) => (
          <RowActions
            actions={[
              { label: tr('Return'), icon: BookDown, permission: PERMS.library.circulate, hidden: l.status !== 'issued', onSelect: () => setReturning({ loan: l, outcome: 'returned' }) },
              { label: tr('Report damaged'), icon: XCircle, permission: PERMS.library.circulate, hidden: l.status !== 'issued', onSelect: () => setReturning({ loan: l, outcome: 'damaged' }) },
              { label: tr('Report lost'), icon: XCircle, permission: PERMS.library.circulate, hidden: l.status !== 'issued', destructive: true, onSelect: () => setReturning({ loan: l, outcome: 'lost' }) },
            ]}
          />
        )}
        empty={{ title: tr('No loans'), description: tr('Books issued at the desk appear here.') }}
      />
      <ConfirmDialog
        open={returning != null}
        onOpenChange={(o) => !o && setReturning(null)}
        title={returning ? (returning.outcome === 'returned' ? tr('Return {book_title}?', { book_title: returning.loan.book_title }) : tr('Report {book_title} {outcome}?', { book_title: returning.loan.book_title, outcome: returning.outcome })) : ''}
        description={returning?.outcome === 'returned' ? (returning.loan.is_overdue ? tr('It’s late: an overdue fine is raised.') : undefined) : tr('The member is fined the copy’s price, on top of any overdue fine.')}
        confirmLabel={returning?.outcome === 'returned' ? tr('Return') : tr('Report')}
        tone={returning?.outcome === 'returned' ? 'default' : 'destructive'}
        onConfirm={async () => {
          await ret.mutateAsync({ id: returning!.loan.id, outcome: returning!.outcome })
          toast.success(tr('Done.'))
        }}
      />
    </>
  )
}

const RES_TONE: Record<string, StatusTone> = { pending: 'warning', ready: 'info', fulfilled: 'success', cancelled: 'muted', expired: 'muted' }

/** Who's waiting for which book; hand over held copies, cancel, or sweep expired holds. */
export function ReservationsPage() {
  const list = useListState({ filters: ['status'] })
  const query = useReservations(list.query)
  const fulfil = useFulfilReservation()
  const cancel = useCancelReservation()
  const expire = useExpireReservations()
  const [handing, setHanding] = useState<Reservation | null>(null)
  const [cancelling, setCancelling] = useState<Reservation | null>(null)
  const [sweeping, setSweeping] = useState(false)
  const columns: Column<Reservation>[] = [
    { id: 'book', header: tr('Book'), mobile: 'title', cell: (r) => <span className="font-medium">{r.book_title}</span> },
    { id: 'member', header: tr('Member'), cell: (r) => r.member_name },
    { id: 'reserved', header: tr('Reserved'), className: 'tabular-nums', cell: (r) => day(r.reserved_at) },
    { id: 'held', header: tr('Held copy'), mobile: 'hidden', cell: (r) => (r.accession_number ? <span className="font-mono text-xs">{r.accession_number}</span> : '—') },
    { id: 'expires', header: tr('Collect by'), className: 'tabular-nums', cell: (r) => day(r.expires_at) },
    { id: 'status', header: tr('Status'), cell: (r) => <StatusBadge status={r.status} tone={RES_TONE[r.status]} label={enumLabel('ReservationStatusEnum', r.status)} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Reservations')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchable={false}
        toolbar={
          <PermissionGate permission={PERMS.library.manage}>
            <Button variant="outline" onClick={() => setSweeping(true)}>
              <Clock aria-hidden /> {tr('Expire uncollected')}
            </Button>
          </PermissionGate>
        }
        filters={[{ name: 'status', label: tr('Status'), options: enumOptions('ReservationStatusEnum') }]}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: tr('Hand over'), icon: PackageCheck, permission: PERMS.library.circulate, hidden: r.status !== 'ready', onSelect: () => setHanding(r) },
              { label: tr('Cancel'), icon: XCircle, permission: PERMS.library.circulate, hidden: r.status !== 'pending' && r.status !== 'ready', destructive: true, onSelect: () => setCancelling(r) },
            ]}
          />
        )}
        empty={{ title: tr('No reservations'), description: tr('A book with no copy on the shelf can be reserved from its page.') }}
      />
      <ConfirmDialog
        open={handing != null}
        onOpenChange={(o) => !o && setHanding(null)}
        title={handing ? tr('Hand {accession_number} to {member_name}?', { accession_number: handing.accession_number, member_name: handing.member_name }) : ''}
        description={tr('It becomes a loan from today.')}
        confirmLabel={tr('Hand over')}
        onConfirm={async () => {
          const loan = await fulfil.mutateAsync(handing!.id)
          toast.success(tr('Issued, due {day}.', { day: day(loan.due_at) }))
        }}
      />
      <ReasonDialog
        open={cancelling != null}
        title={tr('Cancel this reservation?')}
        label={tr('Reason')}
        submitLabel={tr('Cancel reservation')}
        onClose={() => setCancelling(null)}
        onSubmit={async (reason) => {
          await cancel.mutateAsync({ id: cancelling!.id, reason })
          toast.success(tr('Reservation cancelled.'))
        }}
      />
      <ConfirmDialog
        open={sweeping}
        onOpenChange={setSweeping}
        title={tr('Expire uncollected holds?')}
        description={tr('Held copies past their collection date go to the next person waiting, or back on the shelf.')}
        confirmLabel={tr('Expire')}
        onConfirm={async () => {
          const r = await expire.mutateAsync()
          toast.success(r.expired ? tr('{expired} expired.', { expired: r.expired }) : tr('Nothing to expire.'))
        }}
      />
    </>
  )
}

const FINE_TONE: Record<string, StatusTone> = { pending: 'warning', paid: 'success', waived: 'muted' }

/** Overdue, lost and damaged fines: take payment or waive. */
export function FinesPage() {
  const list = useListState({ filters: ['status', 'category'] })
  const query = useFines(list.query)
  const pay = usePayFine()
  const waive = useWaiveFine()
  const [paying, setPaying] = useState<Fine | null>(null)
  const [waiving, setWaiving] = useState<Fine | null>(null)
  const columns: Column<Fine>[] = [
    { id: 'member', header: tr('Member'), mobile: 'title', cell: (f) => <span className="font-medium">{f.member_name}</span> },
    { id: 'book', header: tr('Book'), cell: (f) => f.book_title },
    { id: 'category', header: tr('For'), cell: (f) => `${enumLabel('FineCategoryEnum', f.category)}${f.note ? ` · ${f.note}` : ''}` },
    { id: 'amount', header: tr('Amount'), className: 'text-right', cell: (f) => <Money value={f.amount} className="font-medium" /> },
    { id: 'raised', header: tr('Raised'), mobile: 'hidden', className: 'tabular-nums', cell: (f) => formatDateTime(f.created_at) },
    { id: 'status', header: tr('Status'), cell: (f) => <StatusBadge status={f.status} tone={FINE_TONE[f.status]} label={enumLabel('FineStatusEnum', f.status)} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Library fines')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(f) => f.id}
        searchable={false}
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('FineStatusEnum') },
          { name: 'category', label: tr('For'), options: enumOptions('FineCategoryEnum') },
        ]}
        rowActions={(f) => (
          <RowActions
            actions={[
              { label: tr('Record payment'), icon: HandCoins, permission: PERMS.library.circulate, hidden: f.status !== 'pending', onSelect: () => setPaying(f) },
              { label: tr('Waive'), icon: XCircle, permission: PERMS.library.circulate, hidden: f.status !== 'pending', onSelect: () => setWaiving(f) },
            ]}
          />
        )}
        empty={{ title: tr('No fines'), description: tr('Fines are raised when books come back late, damaged or lost.') }}
      />
      <ConfirmDialog
        open={paying != null}
        onOpenChange={(o) => !o && setPaying(null)}
        title={paying ? tr('Record {member_name}’s payment?', { member_name: paying.member_name }) : ''}
        description={paying ? <>{tr('The full fine') + ','} <Money value={paying.amount} />{', ' + tr('received at the desk.')}</> : undefined}
        confirmLabel={tr('Record payment')}
        onConfirm={async () => {
          await pay.mutateAsync(paying!.id)
          toast.success(tr('Fine paid.'))
        }}
      />
      <ReasonDialog
        open={waiving != null}
        title={tr('Waive this fine?')}
        label={tr('Reason')}
        submitLabel={tr('Waive')}
        onClose={() => setWaiving(null)}
        onSubmit={async (reason) => {
          await waive.mutateAsync({ id: waiving!.id, reason })
          toast.success(tr('Fine waived.'))
        }}
      />
    </>
  )
}
