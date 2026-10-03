import { Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { Money } from '../components/money'
import { usePayment, useReceipts, useRefunds } from '../hooks/useFinance'

/** A payment's numbered receipt, laid out to print, with any refunds against it. */
export default function ReceiptPage() {
  const id = Number(useParams().id)
  const payment = usePayment(Number.isFinite(id) ? id : null)
  const receipts = useReceipts({ payment: id })
  const refunds = useRefunds({ ...PICKER_PARAMS, payment: id })
  const { user } = useAuth()

  if (payment.isPending) return <PageLoader />
  if (payment.isError) return <ErrorState error={payment.error} onRetry={() => void payment.refetch()} />
  const p = payment.data
  const receipt = receipts.data?.results[0]

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        className="print:hidden"
        backTo={`/finance/invoices/${p.invoice}`}
        title={receipt ? `Receipt ${receipt.receipt_number}` : 'Payment'}
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden /> Print
          </Button>
        }
      />
      <article className="rounded-lg border bg-card p-6 print:border-0 print:p-0">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
          <div>
            <p className="text-lg font-semibold">{user?.organization?.name}</p>
            <p className="text-sm text-muted-foreground">Payment receipt</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-medium">{receipt?.receipt_number ?? '—'}</p>
            <p className="text-muted-foreground">{formatDateTime(receipt?.issued_at ?? p.paid_at)}</p>
          </div>
        </header>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Received from</dt>
            <dd className="font-medium">{p.student_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Against invoice</dt>
            <dd>
              <Link to={`/finance/invoices/${p.invoice}`} className="font-mono hover:underline">
                {p.invoice_number}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Method</dt>
            <dd>
              {enumLabel('PaymentMethodEnum', p.method)}
              {p.reference ? ` · ${p.reference}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Paid on</dt>
            <dd className="tabular-nums">{formatDateTime(p.paid_at)}</dd>
          </div>
        </dl>
        <p className="mt-6 flex items-baseline justify-between border-y py-3">
          <span className="text-sm text-muted-foreground">Amount received</span>
          <Money value={p.amount} className="text-2xl font-semibold" />
        </p>
        {p.note && <p className="mt-3 text-sm">{p.note}</p>}
        {(refunds.data?.results ?? []).length > 0 && (
          <section className="mt-4">
            <h2 className="mb-1 text-sm font-semibold">Refunded</h2>
            <ul className="divide-y text-sm">
              {refunds.data!.results.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 py-1.5">
                  <span>
                    {formatDateTime(r.refunded_at)} · {r.reason}
                  </span>
                  <Money value={r.amount} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  )
}
