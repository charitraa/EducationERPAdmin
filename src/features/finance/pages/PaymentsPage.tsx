import { useNavigate, useSearchParams } from 'react-router-dom'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { useListState } from '@/hooks/usePagination'
import { formatDateTime } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Payment, Refund } from '../api/finance.api'
import { isPositive, Money } from '../components/money'
import { usePayments, useRefunds } from '../hooks/useFinance'

function Payments() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['method'], defaultOrdering: '-paid_at' })
  const query = usePayments(list.query)
  const columns: Column<Payment>[] = [
    { id: 'when', header: 'Received', sortField: 'paid_at', className: 'whitespace-nowrap tabular-nums', cell: (p) => formatDateTime(p.paid_at) },
    { id: 'student', header: 'Student', mobile: 'title', cell: (p) => <span className="font-medium">{p.student_name}</span> },
    { id: 'invoice', header: 'Invoice', className: 'font-mono text-xs', cell: (p) => p.invoice_number },
    { id: 'method', header: 'Method', cell: (p) => `${enumLabel('PaymentMethodEnum', p.method)}${p.reference ? ` · ${p.reference}` : ''}` },
    {
      id: 'amount',
      header: 'Amount',
      className: 'text-right',
      cell: (p) => (
        <span>
          <Money value={p.amount} className="font-medium" />
          {p.refundable_amount !== p.amount && <span className="block text-xs text-muted-foreground">{isPositive(p.refundable_amount) ? 'part refunded' : 'refunded'}</span>}
        </span>
      ),
    },
  ]
  return (
    <DataTable
      ariaLabel="Payments"
      columns={columns}
      query={query}
      list={list}
      getRowId={(p) => p.id}
      searchable={false}
      onRowClick={(p) => navigate(`/finance/payments/${p.id}`)}
      filters={[{ name: 'method', label: 'Method', options: enumOptions('PaymentMethodEnum') }]}
      empty={{ title: 'No payments yet', description: 'Take a payment from an invoice; each one gets a numbered receipt.' }}
    />
  )
}

function Refunds() {
  const navigate = useNavigate()
  const list = useListState({ filters: [] })
  const query = useRefunds(list.query)
  const columns: Column<Refund>[] = [
    { id: 'when', header: 'Refunded', className: 'whitespace-nowrap tabular-nums', cell: (r) => formatDateTime(r.refunded_at) },
    { id: 'invoice', header: 'Invoice', mobile: 'title', className: 'font-mono text-xs', cell: (r) => r.invoice_number },
    { id: 'reason', header: 'Reason', cell: (r) => r.reason },
    { id: 'amount', header: 'Amount', className: 'text-right', cell: (r) => <Money value={r.amount} className="font-medium" /> },
  ]
  return (
    <DataTable
      ariaLabel="Refunds"
      columns={columns}
      query={query}
      list={list}
      getRowId={(r) => r.id}
      searchable={false}
      onRowClick={(r) => navigate(`/finance/payments/${r.payment}`)}
      empty={{ title: 'No refunds', description: 'Refunds are made from a payment on its invoice.' }}
    />
  )
}

/** Every payment taken, and every refund given back. */
export default function PaymentsPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'refunds' ? 'refunds' : 'payments'
  return (
    <>
      <div className="mb-4 inline-flex rounded-md border p-0.5" role="tablist" aria-label="Payments">
        {(['payments', 'refunds'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setParams(v === 'payments' ? {} : { view: v }, { replace: true })}
            className={cn('rounded px-3 py-1.5 text-sm capitalize', view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {v}
          </button>
        ))}
      </div>
      {view === 'payments' ? <Payments /> : <Refunds />}
    </>
  )
}
