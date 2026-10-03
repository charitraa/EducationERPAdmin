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

const day = (iso: string | null | undefined) => (iso ? formatDate(iso.slice(0, 10)) : '—')

function ReasonDialog({ open, title, label, submitLabel, onClose, onSubmit }: { open: boolean; title: string; label: string; submitLabel: string; onClose: () => void; onSubmit: (reason: string) => Promise<unknown> }) {
  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      submitLabel={submitLabel}
      schema={z.object({ reason: z.string().trim().min(1, 'Say why.').max(255) })}
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
      header: 'Book',
      mobile: 'title',
      cell: (l) => (
        <span>
          <span className="font-medium">{l.book_title}</span> <span className="font-mono text-xs text-muted-foreground">{l.accession_number}</span>
        </span>
      ),
    },
    { id: 'member', header: 'Member', cell: (l) => `${l.member_name} (${l.member_number})` },
    { id: 'issued', header: 'Issued', className: 'tabular-nums', cell: (l) => day(l.issued_at) },
    { id: 'due', header: 'Due', className: 'tabular-nums', cell: (l) => <span className={l.is_overdue ? 'font-medium text-danger' : undefined}>{day(l.due_at)}</span> },
    { id: 'returned', header: 'Back', mobile: 'hidden', className: 'tabular-nums', cell: (l) => day(l.returned_at) },
    {
      id: 'status',
      header: 'Status',
      cell: (l) =>
        l.is_overdue ? <StatusBadge status="rejected" tone="danger" label="Overdue" /> : <StatusBadge status={l.status === 'issued' ? 'open' : l.status === 'lost' ? 'rejected' : 'completed'} label={enumLabel('IssueStatusEnum', l.status)} />,
    },
  ]
  return (
    <>
      {list.filters.member && (
        <p className="mb-3 text-sm">
          One member’s loans.{' '}
          <button type="button" className="underline" onClick={() => list.setFilter('member', undefined)}>
            Show everyone’s
          </button>
        </p>
      )}
      <DataTable
        ariaLabel="Loans"
        columns={columns}
        query={query}
        list={list}
        getRowId={(l) => l.id}
        searchPlaceholder="Accession no., title or member no.…"
        filters={[{ name: 'status', label: 'Status', options: enumOptions('IssueStatusEnum') }]}
        rowActions={(l) => (
          <RowActions
            actions={[
              { label: 'Return', icon: BookDown, permission: PERMS.library.circulate, hidden: l.status !== 'issued', onSelect: () => setReturning({ loan: l, outcome: 'returned' }) },
              { label: 'Report damaged', icon: XCircle, permission: PERMS.library.circulate, hidden: l.status !== 'issued', onSelect: () => setReturning({ loan: l, outcome: 'damaged' }) },
              { label: 'Report lost', icon: XCircle, permission: PERMS.library.circulate, hidden: l.status !== 'issued', destructive: true, onSelect: () => setReturning({ loan: l, outcome: 'lost' }) },
            ]}
          />
        )}
        empty={{ title: 'No loans', description: 'Books issued at the desk appear here.' }}
      />
      <ConfirmDialog
        open={returning != null}
        onOpenChange={(o) => !o && setReturning(null)}
        title={returning ? (returning.outcome === 'returned' ? `Return ${returning.loan.book_title}?` : `Report ${returning.loan.book_title} ${returning.outcome}?`) : ''}
        description={returning?.outcome === 'returned' ? (returning.loan.is_overdue ? 'It’s late: an overdue fine is raised.' : undefined) : 'The member is fined the copy’s price, on top of any overdue fine.'}
        confirmLabel={returning?.outcome === 'returned' ? 'Return' : 'Report'}
        tone={returning?.outcome === 'returned' ? 'default' : 'destructive'}
        onConfirm={async () => {
          await ret.mutateAsync({ id: returning!.loan.id, outcome: returning!.outcome })
          toast.success('Done.')
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
    { id: 'book', header: 'Book', mobile: 'title', cell: (r) => <span className="font-medium">{r.book_title}</span> },
    { id: 'member', header: 'Member', cell: (r) => r.member_name },
    { id: 'reserved', header: 'Reserved', className: 'tabular-nums', cell: (r) => day(r.reserved_at) },
    { id: 'held', header: 'Held copy', mobile: 'hidden', cell: (r) => (r.accession_number ? <span className="font-mono text-xs">{r.accession_number}</span> : '—') },
    { id: 'expires', header: 'Collect by', className: 'tabular-nums', cell: (r) => day(r.expires_at) },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} tone={RES_TONE[r.status]} label={enumLabel('ReservationStatusEnum', r.status)} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Reservations"
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchable={false}
        toolbar={
          <PermissionGate permission={PERMS.library.manage}>
            <Button variant="outline" onClick={() => setSweeping(true)}>
              <Clock aria-hidden /> Expire uncollected
            </Button>
          </PermissionGate>
        }
        filters={[{ name: 'status', label: 'Status', options: enumOptions('ReservationStatusEnum') }]}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: 'Hand over', icon: PackageCheck, permission: PERMS.library.circulate, hidden: r.status !== 'ready', onSelect: () => setHanding(r) },
              { label: 'Cancel', icon: XCircle, permission: PERMS.library.circulate, hidden: r.status !== 'pending' && r.status !== 'ready', destructive: true, onSelect: () => setCancelling(r) },
            ]}
          />
        )}
        empty={{ title: 'No reservations', description: 'A book with no copy on the shelf can be reserved from its page.' }}
      />
      <ConfirmDialog
        open={handing != null}
        onOpenChange={(o) => !o && setHanding(null)}
        title={handing ? `Hand ${handing.accession_number} to ${handing.member_name}?` : ''}
        description="It becomes a loan from today."
        confirmLabel="Hand over"
        onConfirm={async () => {
          const loan = await fulfil.mutateAsync(handing!.id)
          toast.success(`Issued, due ${day(loan.due_at)}.`)
        }}
      />
      <ReasonDialog
        open={cancelling != null}
        title="Cancel this reservation?"
        label="Reason"
        submitLabel="Cancel reservation"
        onClose={() => setCancelling(null)}
        onSubmit={async (reason) => {
          await cancel.mutateAsync({ id: cancelling!.id, reason })
          toast.success('Reservation cancelled.')
        }}
      />
      <ConfirmDialog
        open={sweeping}
        onOpenChange={setSweeping}
        title="Expire uncollected holds?"
        description="Held copies past their collection date go to the next person waiting, or back on the shelf."
        confirmLabel="Expire"
        onConfirm={async () => {
          const r = await expire.mutateAsync()
          toast.success(r.expired ? `${r.expired} expired.` : 'Nothing to expire.')
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
    { id: 'member', header: 'Member', mobile: 'title', cell: (f) => <span className="font-medium">{f.member_name}</span> },
    { id: 'book', header: 'Book', cell: (f) => f.book_title },
    { id: 'category', header: 'For', cell: (f) => `${enumLabel('FineCategoryEnum', f.category)}${f.note ? ` · ${f.note}` : ''}` },
    { id: 'amount', header: 'Amount', className: 'text-right', cell: (f) => <Money value={f.amount} className="font-medium" /> },
    { id: 'raised', header: 'Raised', mobile: 'hidden', className: 'tabular-nums', cell: (f) => formatDateTime(f.created_at) },
    { id: 'status', header: 'Status', cell: (f) => <StatusBadge status={f.status} tone={FINE_TONE[f.status]} label={enumLabel('FineStatusEnum', f.status)} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Library fines"
        columns={columns}
        query={query}
        list={list}
        getRowId={(f) => f.id}
        searchable={false}
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('FineStatusEnum') },
          { name: 'category', label: 'For', options: enumOptions('FineCategoryEnum') },
        ]}
        rowActions={(f) => (
          <RowActions
            actions={[
              { label: 'Record payment', icon: HandCoins, permission: PERMS.library.circulate, hidden: f.status !== 'pending', onSelect: () => setPaying(f) },
              { label: 'Waive', icon: XCircle, permission: PERMS.library.circulate, hidden: f.status !== 'pending', onSelect: () => setWaiving(f) },
            ]}
          />
        )}
        empty={{ title: 'No fines', description: 'Fines are raised when books come back late, damaged or lost.' }}
      />
      <ConfirmDialog
        open={paying != null}
        onOpenChange={(o) => !o && setPaying(null)}
        title={paying ? `Record ${paying.member_name}’s payment?` : ''}
        description={paying ? <>The full fine, <Money value={paying.amount} />, received at the desk.</> : undefined}
        confirmLabel="Record payment"
        onConfirm={async () => {
          await pay.mutateAsync(paying!.id)
          toast.success('Fine paid.')
        }}
      />
      <ReasonDialog
        open={waiving != null}
        title="Waive this fine?"
        label="Reason"
        submitLabel="Waive"
        onClose={() => setWaiving(null)}
        onSubmit={async (reason) => {
          await waive.mutateAsync({ id: waiving!.id, reason })
          toast.success('Fine waived.')
        }}
      />
    </>
  )
}
