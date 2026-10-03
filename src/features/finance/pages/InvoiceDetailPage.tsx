import { Ban, CalendarRange, Plus, Printer, Receipt as ReceiptIcon, Undo2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatMoney, fromPaisa, toPaisa } from '@/lib/currency'
import { formatDate, formatDateTime } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Payment } from '../api/finance.api'
import { AddItemDialog, CancelInvoiceDialog, InstallmentsDialog, RecordPaymentDialog } from '../components/InvoiceDialogs'
import { isPositive, Money, moneyInput } from '../components/money'
import { useInvoice, usePayments, useRefund } from '../hooks/useFinance'
import { InvoiceStanding } from './InvoicesPage'

function RefundDialog({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const refund = useRefund()
  return (
    <FormDialog
      open={payment != null}
      onOpenChange={(o) => !o && onClose()}
      title="Refund a payment"
      description={payment ? `Up to ${formatMoney(payment.refundable_amount)} of this ${formatMoney(payment.amount)} payment. The payment stays on record; the refund reverses it.` : undefined}
      submitLabel="Refund"
      schema={z
        .object({ amount: moneyInput, reason: z.string().trim().min(1, 'Say why.').max(255) })
        .refine((v) => !payment || (toPaisa(v.amount) ?? 0n) <= (toPaisa(payment.refundable_amount) ?? 0n), { path: ['amount'], message: 'More than can be refunded.' })}
      defaultValues={{ amount: payment?.refundable_amount ?? '', reason: '' }}
      onSubmit={async (v) => {
        await refund.mutateAsync({ id: payment!.id, amount: v.amount, reason: v.reason })
        toast.success(`${formatMoney(v.amount)} refunded.`)
      }}
    >
      {({ register, formState: { errors } }) => (
        <>
          <FormField label="Amount" required error={errors.amount?.message}>
            <Input {...register('amount')} inputMode="decimal" className="tabular-nums" />
          </FormField>
          <FormField label="Reason" required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder="Paid twice, overcharged…" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** One invoice: its lines, installments, payments and refunds, with what can be done to it. */
export default function InvoiceDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const invoice = useInvoice(Number.isFinite(id) ? id : null)
  const payments = usePayments({ ...PICKER_PARAMS, invoice: id })
  const { can } = usePermissions()
  const [dialog, setDialog] = useState<'pay' | 'item' | 'installments' | 'cancel' | null>(null)
  const [refunding, setRefunding] = useState<Payment | null>(null)

  if (invoice.isPending) return <PageLoader />
  if (invoice.isError) return <ErrorState error={invoice.error} onRetry={() => void invoice.refetch()} />
  const inv = invoice.data
  const open = inv.status === 'issued'
  const hasPayments = (payments.data?.results.length ?? 0) > 0
  const close = (o: boolean) => !o && setDialog(null)

  return (
    <div>
      <PageHeader
        backTo="/finance/invoices"
        title={`Invoice ${inv.invoice_number}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Link to={`/finance/reports?view=statement&student=${inv.student}`} className="hover:underline">
              {inv.student_name}
            </Link>
            <span className="font-mono text-xs">{inv.student_number}</span>· {inv.term_name ?? 'One-time'} · {enumLabel('InvoiceSourceEnum', inv.source)}
            <InvoiceStanding invoice={inv} />
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()} className="print:hidden">
              <Printer aria-hidden /> Print
            </Button>
            {open && can(PERMS.finance.manage) && (
              <>
                <Button variant="outline" onClick={() => setDialog('item')} className="print:hidden">
                  <Plus aria-hidden /> Add line
                </Button>
                {!hasPayments && (
                  <>
                    <Button variant="outline" onClick={() => setDialog('installments')} className="print:hidden">
                      <CalendarRange aria-hidden /> Installments
                    </Button>
                    <Button variant="outline" onClick={() => setDialog('cancel')} className="print:hidden">
                      <Ban aria-hidden /> Cancel
                    </Button>
                  </>
                )}
              </>
            )}
            {open && !inv.is_paid && can(PERMS.finance.collect) && (
              <Button onClick={() => setDialog('pay')} className="print:hidden">
                <Wallet aria-hidden /> Take payment
              </Button>
            )}
          </>
        }
      />

      {inv.status === 'cancelled' && (
        <p className="mb-4 rounded-lg border border-danger/20 bg-danger-soft p-3 text-sm">
          Cancelled {inv.cancelled_at ? formatDateTime(inv.cancelled_at) : ''}: {inv.cancelled_reason}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border bg-card">
          <dl className="grid grid-cols-2 gap-3 border-b p-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Issued</dt>
              <dd className="tabular-nums">{formatDate(inv.issue_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Due</dt>
              <dd className={inv.is_overdue ? 'font-medium text-danger tabular-nums' : 'tabular-nums'}>{formatDate(inv.due_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Paid</dt>
              <dd>
                <Money value={inv.paid_amount} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Balance</dt>
              <dd className="text-lg font-semibold">
                <Money value={inv.status === 'cancelled' ? '0' : inv.balance} tone="none" />
              </dd>
            </div>
          </dl>
          <table className="w-full text-sm" aria-label="Invoice lines">
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Description</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(inv.items ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">
                    {l.description}
                    {l.category_name && l.category_name !== l.description && <span className="text-xs text-muted-foreground"> · {l.category_name}</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{enumLabel('InvoiceItemKindEnum', l.kind)}</td>
                  <td className="px-4 py-2 text-right">
                    <Money value={l.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="px-4 py-2" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-2 text-right">
                  <Money value={inv.total} />
                </td>
              </tr>
            </tfoot>
          </table>
          {inv.note && <p className="border-t px-4 py-2 text-sm text-muted-foreground">{inv.note}</p>}
        </section>

        <div className="grid content-start gap-6">
          {(inv.installments ?? []).length > 0 && (
            <section className="rounded-lg border bg-card">
              <h2 className="border-b px-4 py-2 text-sm font-semibold">Installments</h2>
              <ol className="divide-y text-sm">
                {(inv.installments ?? []).map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-6 tabular-nums text-muted-foreground">{i.sequence}.</span>
                    <span className={i.is_overdue ? 'flex-1 tabular-nums text-danger' : 'flex-1 tabular-nums'}>Due {formatDate(i.due_date)}</span>
                    <Money value={i.amount} />
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-4 py-2 text-sm font-semibold">Payments</h2>
            {(payments.data?.results ?? []).length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nothing paid yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {payments.data!.results.map((p) => {
                  const refunded = (toPaisa(p.amount) ?? 0n) - (toPaisa(p.refundable_amount) ?? 0n)
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          <Money value={p.amount} /> · {enumLabel('PaymentMethodEnum', p.method)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(p.paid_at)}
                          {p.reference ? ` · ${p.reference}` : ''}
                        </p>
                        {refunded > 0n && <StatusBadge status="returned" label={`${formatMoney(fromPaisa(refunded))} refunded`} className="mt-1" />}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/finance/payments/${p.id}`)} aria-label="Receipt" className="print:hidden">
                        <ReceiptIcon aria-hidden />
                      </Button>
                      {can(PERMS.finance.manage) && isPositive(p.refundable_amount) && (
                        <Button size="sm" variant="ghost" onClick={() => setRefunding(p)} aria-label="Refund" className="print:hidden">
                          <Undo2 aria-hidden />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <RecordPaymentDialog invoice={dialog === 'pay' ? inv : null} onClose={() => setDialog(null)} />
      <AddItemDialog invoice={inv} open={dialog === 'item'} onOpenChange={close} />
      <InstallmentsDialog invoice={inv} open={dialog === 'installments'} onOpenChange={close} />
      <CancelInvoiceDialog invoice={inv} open={dialog === 'cancel'} onOpenChange={close} />
      <RefundDialog payment={refunding} onClose={() => setRefunding(null)} />
    </div>
  )
}
