import { AlertTriangle, FileText, HandCoins, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionHeader } from '@/components/common/SectionHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatCard } from '@/components/data-display/StatCard'
import { formatMoney } from '@/lib/currency'
import { formatDate, formatDateTime, todayIso } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { Money } from '../components/money'
import { useCollection, useGrants, useInvoices, useOutstanding, usePayments } from '../hooks/useFinance'
import { tr } from '@/lib/i18n'

/** The finance office's day: what came in this month, what's overdue, and the latest payments. */
export default function OverviewPage() {
  const today = todayIso()
  const monthStart = `${today.slice(0, 8)}01`
  const collection = useCollection({ from: monthStart, to: today })
  const outstanding = useOutstanding()
  const issued = useInvoices({ status: 'issued', page_size: 1 })
  const grants = useGrants({ page_size: 1 })
  const recent = usePayments({ ordering: '-paid_at', page_size: 8 })

  const methods = Object.entries(collection.data?.by_method ?? {})

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={tr('Collected this month')}
          icon={Wallet}
          loading={collection.isPending}
          error={collection.isError}
          value={formatMoney(collection.data?.total)}
          hint={tr('{count} payments since {date}', { count: collection.data?.payments.length ?? 0, date: formatDate(monthStart) })}
          to="/finance/reports?view=collection"
        />
        <StatCard
          label={tr('Overdue')}
          icon={AlertTriangle}
          loading={outstanding.isPending}
          error={outstanding.isError}
          value={formatMoney(outstanding.data?.total_outstanding)}
          hint={tr('{count} invoices past their due date', { count: outstanding.data?.count ?? 0 })}
          to="/finance/reports"
        />
        <StatCard label={tr('Invoices issued')} icon={FileText} loading={issued.isPending} error={issued.isError} value={issued.data?.count ?? 0} hint={tr('Not cancelled')} to="/finance/invoices?status=issued" />
        <StatCard label={tr('Scholarship grants')} icon={HandCoins} loading={grants.isPending} error={grants.isError} value={grants.data?.count ?? 0} hint={tr('Granted to students, past and present')} to="/finance/scholarships" />
      </div>

      {methods.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">{tr('This month by method')}</h2>
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {methods.map(([m, amount]) => (
              <div key={m}>
                <dt className="text-xs text-muted-foreground">{enumLabel('PaymentMethodEnum', m)}</dt>
                <dd className="font-medium">
                  <Money value={amount} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title={tr('Recent payments')} description={<Link to="/finance/payments" className="underline">{tr('All payments')}</Link>} />
          {recent.isPending ? (
            <TableSkeleton rows={5} columns={3} />
          ) : recent.isError ? (
            <ErrorState error={recent.error} onRetry={() => void recent.refetch()} />
          ) : recent.data.results.length === 0 ? (
            <EmptyState title={tr('No payments yet')} description={tr('Record one from an invoice.')} />
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {recent.data.results.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <Link to={`/finance/invoices/${p.invoice}`} className="font-medium hover:underline">
                      {p.student_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.invoice_number} · {enumLabel('PaymentMethodEnum', p.method)} · {formatDateTime(p.paid_at)}
                    </p>
                  </div>
                  <Money value={p.amount} className="font-medium" />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <SectionHeader title={tr('Longest overdue')} description={<Link to="/finance/reports" className="underline">{tr('Full list')}</Link>} />
          {outstanding.isPending ? (
            <TableSkeleton rows={5} columns={3} />
          ) : outstanding.isError ? (
            <ErrorState error={outstanding.error} onRetry={() => void outstanding.refetch()} />
          ) : outstanding.data.invoices.length === 0 ? (
            <EmptyState title={tr('Nothing overdue')} />
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {outstanding.data.invoices.slice(0, 8).map((i) => (
                <li key={i.invoice} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <Link to={`/finance/invoices/${i.invoice}`} className="font-medium hover:underline">
                      {i.student_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {i.invoice_number}
                      {tr('{value} · {days_overdue} days overdue', { value: i.section_name ? ` · ${i.section_name}` : '', days_overdue: i.days_overdue })}
                    </p>
                  </div>
                  <Money value={i.balance} className="font-medium text-danger" tone="none" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
