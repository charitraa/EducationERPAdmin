import { AlarmClock, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBranchFilter } from '@/app/providers/BranchProvider'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAcademicYearOptions } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useListState } from '@/hooks/usePagination'
import { formatDate } from '@/lib/dates'
import { enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { InvoiceRow } from '../api/finance.api'
import { LateFeesDialog, RecordPaymentDialog } from '../components/InvoiceDialogs'
import { isPositive, Money } from '../components/money'
import { useInvoices } from '../hooks/useFinance'
import { tr } from '@/lib/i18n'

/** Paid, part paid, overdue, open or cancelled: one badge for where an invoice stands. */
export function InvoiceStanding({ invoice }: { invoice: Pick<InvoiceRow, 'status' | 'is_paid' | 'is_overdue' | 'paid_amount'> }) {
  if (invoice.status === 'cancelled') return <StatusBadge status="cancelled" label={tr('Cancelled')} />
  if (invoice.status === 'draft') return <StatusBadge status="draft" label={tr('Draft')} />
  if (invoice.is_paid) return <StatusBadge status="paid" label={tr('Paid')} />
  if (invoice.is_overdue) return <StatusBadge status="rejected" tone="danger" label={tr('Overdue')} />
  if (isPositive(invoice.paid_amount)) return <StatusBadge status="in_progress" label={tr('Part paid')} />
  return <StatusBadge status="open" label={tr('Unpaid')} />
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status', 'source', 'academic_year', 'campus'], followBranch: true })
  const branchFilter = useBranchFilter()
  const query = useInvoices(list.query)
  const years = useAcademicYearOptions()
  const [paying, setPaying] = useState<InvoiceRow | null>(null)
  const [lateFees, setLateFees] = useState(false)

  const columns: Column<InvoiceRow>[] = [
    { id: 'number', header: tr('Invoice'), className: 'font-mono text-xs', cell: (i) => i.invoice_number },
    {
      id: 'student',
      header: tr('Student'),
      mobile: 'title',
      cell: (i) => (
        <span>
          <span className="font-medium">{i.student_name}</span> <span className="font-mono text-xs text-muted-foreground">{i.student_number}</span>
        </span>
      ),
    },
    { id: 'for', header: tr('For'), cell: (i) => i.term_name ?? tr('One-time') },
    { id: 'issued', header: tr('Issued'), sortField: 'issue_date', className: 'tabular-nums whitespace-nowrap', mobile: 'hidden', cell: (i) => formatDate(i.issue_date) },
    { id: 'due', header: tr('Due'), sortField: 'due_date', className: 'tabular-nums whitespace-nowrap', cell: (i) => formatDate(i.due_date) },
    { id: 'total', header: tr('Total'), sortField: 'total', className: 'text-right', cell: (i) => <Money value={i.total} /> },
    { id: 'balance', header: tr('Balance'), className: 'text-right', cell: (i) => <Money value={i.status === 'cancelled' ? '0' : i.balance} className={i.is_overdue ? 'font-medium text-danger' : undefined} tone="none" /> },
    { id: 'status', header: tr('Status'), cell: (i) => <InvoiceStanding invoice={i} /> },
  ]

  return (
    <>
      <DataTable
        ariaLabel={tr('Invoices')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(i) => i.id}
        searchPlaceholder={tr('Search invoice number, student…')}
        onRowClick={(i) => navigate(`/finance/invoices/${i.id}`)}
        toolbar={
          <PermissionGate permission={PERMS.finance.manage}>
            <Button variant="outline" onClick={() => setLateFees(true)}>
              <AlarmClock aria-hidden /> {tr('Late fees')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('InvoiceStatusEnum') },
          { name: 'source', label: tr('Billed by'), options: enumOptions('InvoiceSourceEnum') },
          { name: 'academic_year', label: tr('Year'), options: (years.data ?? []).map((y) => ({ value: String(y.id), label: y.name })) },
          branchFilter,
        ]}
        rowActions={(i) => <RowActions actions={[{ label: tr('Take payment'), icon: Wallet, permission: PERMS.finance.collect, hidden: i.status !== 'issued' || i.is_paid, onSelect: () => setPaying(i) }]} />}
        empty={{ title: tr('No invoices yet'), description: tr('Invoices are generated from a fee structure, for a whole term at once or one student at a time.'),
          action: (
            <PermissionGate permission={PERMS.finance.manage}>
              <Button asChild variant="outline">
                <Link to="/finance/fees">{tr('Go to fee structures')}</Link>
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <RecordPaymentDialog invoice={paying} onClose={() => setPaying(null)} />
      <LateFeesDialog open={lateFees} onOpenChange={setLateFees} />
    </>
  )
}
