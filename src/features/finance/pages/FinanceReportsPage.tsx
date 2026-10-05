import { Printer, UserSearch } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { DatePicker } from '@/components/forms/DatePicker'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { formatDate, formatDateTime, parseIsoDate, toIsoDate, todayIso } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Money } from '../components/money'
import { useCollection, useOutstanding, useStatement } from '../hooks/useFinance'
import { tr } from '@/lib/i18n'

const VIEWS = [
  { value: 'outstanding', label: tr('Overdue') },
  { value: 'collection', label: tr('Day sheet') },
  { value: 'statement', label: tr('Student statement') },
] as const

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
    </div>
  )
}

function Table({ label, head, children }: { label: string; head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm" aria-label={label}>
        <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">{head}</thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  )
}

function OutstandingView() {
  const report = useOutstanding()
  if (report.isPending) return <TableSkeleton rows={6} columns={6} />
  if (report.isError) return <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  const r = report.data
  return (
    <>
      <p className="mb-3 text-sm">
        <Money value={r.total_outstanding} className="text-lg font-semibold text-danger" tone="none" /> {tr('overdue on {count} invoice{value}, as of {date}.', { count: r.count, value: r.count === 1 ? '' : 's', date: formatDate(r.as_of) })}
      </p>
      {r.invoices.length === 0 ? (
        <EmptyState title={tr('Nothing overdue')} />
      ) : (
        <Table
          label={tr('Overdue invoices')}
          head={
            <tr>
              <th className="px-3 py-2">{tr('Student')}</th>
              <th className="px-3 py-2">{tr('Class')}</th>
              <th className="px-3 py-2">{tr('Invoice')}</th>
              <th className="px-3 py-2">{tr('Due')}</th>
              <th className="px-3 py-2 text-right">{tr('Days')}</th>
              <th className="px-3 py-2 text-right">{tr('Owed')}</th>
            </tr>
          }
        >
          {r.invoices.map((i) => (
            <tr key={i.invoice}>
              <td className="px-3 py-2">
                <Link to={`?view=statement&student=${i.student}`} className="font-medium hover:underline">
                  {i.student_name}
                </Link>{' '}
                <span className="font-mono text-xs text-muted-foreground">{i.student_number}</span>
              </td>
              <td className="px-3 py-2">{i.section_name ?? '—'}</td>
              <td className="px-3 py-2">
                <Link to={`/finance/invoices/${i.invoice}`} className="font-mono text-xs hover:underline">
                  {i.invoice_number}
                </Link>
              </td>
              <td className="px-3 py-2 tabular-nums">{formatDate(i.due_date)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{i.days_overdue}</td>
              <td className="px-3 py-2 text-right">
                <Money value={i.balance} className="font-medium" />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}

function CollectionView({ from, to }: { from: string; to: string }) {
  const report = useCollection({ from, to })
  if (report.isPending) return <TableSkeleton rows={6} columns={5} />
  if (report.isError) return <ErrorState error={report.error} onRetry={() => void report.refetch()} />
  const r = report.data
  return (
    <>
      <dl className="mb-3 flex flex-wrap gap-x-8 gap-y-2 rounded-lg border bg-card p-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{tr('Total received')}</dt>
          <dd className="text-lg font-semibold">
            <Money value={r.total} />
          </dd>
        </div>
        {Object.entries(r.by_method).map(([m, amount]) => (
          <div key={m}>
            <dt className="text-xs text-muted-foreground">{enumLabel('PaymentMethodEnum', m)}</dt>
            <dd className="text-lg font-medium">
              <Money value={amount} />
            </dd>
          </div>
        ))}
      </dl>
      {r.payments.length === 0 ? (
        <EmptyState title={tr('Nothing received in these dates')} />
      ) : (
        <Table
          label={tr('Payments received')}
          head={
            <tr>
              <th className="px-3 py-2">{tr('When')}</th>
              <th className="px-3 py-2">{tr('Student')}</th>
              <th className="px-3 py-2">{tr('Invoice')}</th>
              <th className="px-3 py-2">{tr('Method')}</th>
              <th className="px-3 py-2 text-right">{tr('Amount')}</th>
            </tr>
          }
        >
          {r.payments.map((p) => (
            <tr key={p.payment}>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDateTime(p.paid_at)}</td>
              <td className="px-3 py-2">{p.student_name}</td>
              <td className="px-3 py-2">
                <Link to={`/finance/payments/${p.payment}`} className="font-mono text-xs hover:underline">
                  {p.invoice_number}
                </Link>
              </td>
              <td className="px-3 py-2">
                {enumLabel('PaymentMethodEnum', p.method)}
                {p.reference ? ` · ${p.reference}` : ''}
              </td>
              <td className="px-3 py-2 text-right">
                <Money value={p.amount} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}

function StatementView({ studentId, onPick }: { studentId: number | null; onPick: (s: Student | null) => void }) {
  const [student, setStudent] = useState<Student | null>(null)
  const statement = useStatement({ student: student?.id ?? studentId })
  return (
    <>
      <div className="mb-4 max-w-md print:hidden">
        <Field label={tr('Student')}>
          {(id) => (
            <StudentPicker
              id={id}
              value={student}
              onChange={(s) => {
                setStudent(s)
                onPick(s)
              }}
            />
          )}
        </Field>
      </div>
      {(student?.id ?? studentId) == null ? (
        <EmptyState title={tr('Find a student')} description={tr('Every invoice, what’s been paid, and what’s still owed.')} icon={UserSearch} />
      ) : statement.isPending ? (
        <TableSkeleton rows={4} columns={6} />
      ) : statement.isError ? (
        <ErrorState error={statement.error} onRetry={() => void statement.refetch()} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-end gap-x-8 gap-y-2">
            <h2 className="text-base font-semibold">
              {statement.data.student_name} <span className="font-mono text-xs font-normal text-muted-foreground">{statement.data.student_number}</span>
            </h2>
            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{tr('Billed')}</dt>
                <dd>
                  <Money value={statement.data.total_billed} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{tr('Paid')}</dt>
                <dd>
                  <Money value={statement.data.total_paid} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{tr('Balance')}</dt>
                <dd className="font-semibold">
                  <Money value={statement.data.balance} tone="none" />
                </dd>
              </div>
            </dl>
            <Button variant="outline" size="sm" className="ml-auto print:hidden" onClick={() => window.print()}>
              <Printer aria-hidden /> {tr('Print')}
            </Button>
          </div>
          {statement.data.invoices.length === 0 ? (
            <EmptyState title={tr('No invoices for this student')} />
          ) : (
            <Table
              label={tr('Statement')}
              head={
                <tr>
                  <th className="px-3 py-2">{tr('Invoice')}</th>
                  <th className="px-3 py-2">{tr('For')}</th>
                  <th className="px-3 py-2">{tr('Issued')}</th>
                  <th className="px-3 py-2">{tr('Due')}</th>
                  <th className="px-3 py-2 text-right">{tr('Total')}</th>
                  <th className="px-3 py-2 text-right">{tr('Paid')}</th>
                  <th className="px-3 py-2 text-right">{tr('Balance')}</th>
                </tr>
              }
            >
              {statement.data.invoices.map((i) => (
                <tr key={i.invoice}>
                  <td className="px-3 py-2">
                    <Link to={`/finance/invoices/${i.invoice}`} className="font-mono text-xs hover:underline">
                      {i.invoice_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{i.term_name ?? tr('One-time')}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDate(i.issue_date)}</td>
                  <td className={cn('px-3 py-2 tabular-nums', i.is_overdue && 'text-danger')}>{formatDate(i.due_date)}</td>
                  <td className="px-3 py-2 text-right">
                    <Money value={i.total} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Money value={i.paid} />
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    <Money value={i.balance} tone="none" />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </>
      )}
    </>
  )
}

/** Who's overdue, what came in (a day sheet by method), and one student's statement. */
export default function FinanceReportsPage() {
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((v) => v.value === params.get('view'))?.value ?? 'outstanding'
  const set = (k: string, v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v) next.set(k, v)
        else next.delete(k)
        return next
      },
      { replace: true },
    )
  const to = params.get('to') || todayIso()
  const from = params.get('from') || toIsoDate(new Date())
  const valid = parseIsoDate(from) != null && parseIsoDate(to) != null && from <= to
  const student = params.get('student')

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <div className="inline-flex rounded-md border p-0.5" role="tablist" aria-label={tr('Report')}>
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => setParams(v.value === 'outstanding' ? {} : { view: v.value }, { replace: true })}
              className={cn('rounded px-3 py-1.5 text-sm', view === v.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {v.label}
            </button>
          ))}
        </div>
        {view === 'collection' && (
          <>
            <Field label={tr('From (AD)')}>{(id) => <DatePicker id={id} value={from} onChange={(v) => set('from', v)} />}</Field>
            <Field label={tr('To (AD)')}>{(id) => <DatePicker id={id} value={to} onChange={(v) => set('to', v)} />}</Field>
          </>
        )}
      </div>
      {view === 'outstanding' ? (
        <OutstandingView />
      ) : view === 'collection' ? (
        valid ? <CollectionView from={from} to={to} /> : <EmptyState title={tr('Check the dates')} />
      ) : (
        <StatementView studentId={student ? Number(student) : null} onPick={(s) => set('student', s ? String(s.id) : '')} />
      )}
    </>
  )
}
