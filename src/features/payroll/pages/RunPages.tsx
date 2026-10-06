import { AlertTriangle, Ban, Banknote, Calculator, CheckCircle2, Download, Landmark, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranchFilter, useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatCard } from '@/components/data-display/StatCard'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Money } from '@/features/finance/components/money'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatDateTime } from '@/lib/dates'
import { enumLabel, enumOptions, pluralize } from '@/lib/formatters'
import { isoDate } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { BankSheet, ComputeResult, PayrollRun, PayslipRow } from '../api/payroll.api'
import { useApproveRun, useBankSheet, useCancelRun, useComputeRun, useCreateRun, useMarkPaid, usePayslips, useRun, useRuns } from '../hooks/usePayroll'
import { downloadCsv } from '@/lib/csv'
import { tr } from '@/lib/i18n'

const TONE: Record<string, StatusTone> = { draft: 'neutral', approved: 'info', paid: 'success', cancelled: 'muted' }

export function RunStatus({ status }: { status: string | null | undefined }) {
  return <StatusBadge status={status ?? 'draft'} tone={TONE[status ?? 'draft']} label={enumLabel('PayrollRunStatusEnum', status)} />
}

const period = (r: Pick<PayrollRun, 'period_start' | 'period_end'>) => `${formatDate(r.period_start)} – ${formatDate(r.period_end)}`

const runSchema = z
  .object({ campus: z.string().min(1, tr('Choose a branch.')), name: z.string().trim().min(1, tr('Name the period.')).max(100), period_start: isoDate, period_end: isoDate, notes: z.string() })
  .refine((v) => v.period_end >= v.period_start, { path: ['period_end'], message: tr('Must not be before the start.') })

/** Pay runs, newest first: one per branch per period. */
export function RunsPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status', 'campus'], followBranch: true })
  const branchFilter = useBranchFilter()
  const query = useRuns(list.query)
  const create = useCreateRun()
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const [creating, setCreating] = useState(false)
  const columns: Column<PayrollRun>[] = [
    { id: 'name', header: tr('Period'), mobile: 'title', cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'dates', header: tr('Dates'), sortField: 'period_start', className: 'whitespace-nowrap tabular-nums', cell: period },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (r) => r.campus_name },
    { id: 'slips', header: tr('Payslips'), className: 'tabular-nums', cell: (r) => (r.computed_at ? r.totals.payslips : <span className="text-muted-foreground">{tr('Not worked out')}</span>) },
    { id: 'gross', header: tr('Gross'), className: 'text-right', cell: (r) => (r.computed_at ? <Money value={r.totals.gross_pay} /> : '—') },
    { id: 'net', header: tr('Net pay'), className: 'text-right font-medium', cell: (r) => (r.computed_at ? <Money value={r.totals.net_pay} /> : '—') },
    { id: 'status', header: tr('Status'), cell: (r) => <RunStatus status={r.status} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Payroll runs')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder={tr('Period name…')}
        onRowClick={(r) => navigate(`/payroll/runs/${r.id}`)}
        create={
          <PermissionGate permission={PERMS.payroll.manage}>
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden /> {tr('New run')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('PayrollRunStatusEnum') },
          branchFilter,
        ]}
        empty={{ title: tr('No payroll runs yet'), description: tr('Open a run for a month, work out the payslips, approve them, then record the payment.') }}
      />
      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title={tr('New payroll run')}
        description={tr('One branch, one pay period. Use the Nepali month’s own dates.')}
        submitLabel={tr('Create')}
        schema={runSchema}
        defaultValues={{ campus: String(selectedBranchId ?? defaultBranchId ?? ''), name: '', period_start: '', period_end: '', notes: '' }}
        onSubmit={async (v) => {
          const run = await create.mutateAsync({ ...v, campus: Number(v.campus) })
          toast.success(tr('Run created. Work out the payslips next.'))
          navigate(`/payroll/runs/${run.id}`)
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('Name')} required error={errors.name?.message}>
                <Input {...register('name')} placeholder={tr('Kartik 2083')} />
              </FormField>
              {isMultiBranch && (
                <FormField label={tr('Branch')} required error={errors.campus?.message}>
                  {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
                </FormField>
              )}
              <FormField label={tr('From')} required error={errors.period_start?.message}>
                {(p) => <Controller control={control} name="period_start" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label={tr('To (inclusive)')} required error={errors.period_end?.message}>
                {(p) => <Controller control={control} name="period_end" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
            <FormField label={tr('Notes')}>
              <Textarea {...register('notes')} rows={2} />
            </FormField>
          </>
        )}
      </FormDialog>
    </>
  )
}

/** The bank sheet as a CSV file, for the bank's bulk-transfer upload. */
function downloadBankSheet(run: PayrollRun, sheet: BankSheet) {
  const header = [tr('Payslip'), tr('Employee no.'), tr('Name'), tr('Bank'), tr('Branch'), tr('Account name'), tr('Account number'), tr('Net pay')]
  const rows = sheet.rows.map((r) => [r.payslip, r.employee_number, r.staff_name, r.bank_name, r.bank_branch, r.account_name, r.account_number, r.net_pay])
  downloadCsv(`bank-sheet-${run.name.replace(/\W+/g, '-').toLowerCase()}.csv`, [header, ...rows])
}

function BankSheetSection({ run }: { run: PayrollRun }) {
  const sheet = useBankSheet(run.id)
  if (!sheet.data || sheet.data.rows.length === 0) return null
  const missing = sheet.data.without_bank_account
  return (
    <section className="mt-6">
      <SectionHeader
        title={tr('Bank sheet')}
        description={tr('Who gets how much, to which account.')}
        action={
          <Button size="sm" variant="outline" onClick={() => downloadBankSheet(run, sheet.data!)}>
            <Download aria-hidden /> {tr('Download CSV')}
          </Button>
        }
      />
      {missing.length > 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {tr('No bank account on file for {missing}. Add it to their', { missing: missing.join(', ') })} <Link to="/hr/profiles" className="underline">{tr('HR profile')}</Link>{', ' + tr('or pay them another way.')}
          </span>
        </p>
      )}
    </section>
  )
}

/** One run: work out payslips, check them, approve, then record the payment. */
export function RunDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const run = useRun(id)
  const list = useListState()
  const slips = usePayslips({ ...list.query, run: id })
  const compute = useComputeRun()
  const approve = useApproveRun()
  const markPaid = useMarkPaid()
  const cancel = useCancelRun()
  const { can } = usePermissions()
  const [result, setResult] = useState<ComputeResult | null>(null)
  const [dialog, setDialog] = useState<'approve' | 'paid' | 'cancel' | null>(null)
  if (run.isPending) return <PageLoader />
  if (run.isError) return <ErrorState error={run.error} onRetry={() => void run.refetch()} />
  const r = run.data
  const draft = r.status === 'draft'

  const work = async () => {
    try {
      const res = await compute.mutateAsync(r.id)
      setResult(res)
      toast.success(tr('{pluralize} worked out{value}.', { pluralize: pluralize(res.payslips, 'payslip'), value: res.skipped.length ? '; ' + tr('{count} skipped', { count: res.skipped.length }) : '' }))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const columns: Column<PayslipRow>[] = [
    { id: 'who', header: tr('Staff member'), mobile: 'title', cell: (p) => (
      <span>
        <span className="font-medium">{p.staff_name}</span> <span className="font-mono text-xs text-muted-foreground">{p.employee_number}</span>
      </span>
    ) },
    { id: 'number', header: tr('Payslip'), mobile: 'hidden', className: 'font-mono text-xs', cell: (p) => p.number },
    { id: 'basic', header: tr('Basic'), className: 'text-right', cell: (p) => <Money value={p.basic} /> },
    { id: 'gross', header: tr('Gross'), className: 'text-right', cell: (p) => <Money value={p.gross_pay} /> },
    { id: 'tax', header: tr('Tax'), className: 'text-right', cell: (p) => <Money value={p.tax} /> },
    { id: 'deductions', header: tr('Deductions'), mobile: 'hidden', className: 'text-right', cell: (p) => <Money value={p.total_deductions} /> },
    { id: 'net', header: tr('Net pay'), className: 'text-right font-medium', cell: (p) => <Money value={p.net_pay} /> },
  ]

  return (
    <div>
      <PageHeader
        backTo="/payroll"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {r.name} <RunStatus status={r.status} />
          </span>
        }
        description={`${period(r)}${r.campus_name ? ` · ${r.campus_name}` : ''}${r.fiscal_year_name ? ` · tax year ${r.fiscal_year_name}` : ' · no fiscal year covers this period, so no tax'}`}
        actions={
          <>
            {draft && can(PERMS.payroll.manage) && (
              <Button variant={r.computed_at ? 'outline' : 'default'} onClick={work} disabled={compute.isPending}>
                <Calculator aria-hidden /> {compute.isPending ? tr('Working out…') : r.computed_at ? tr('Recompute') : tr('Work out payslips')}
              </Button>
            )}
            {draft && r.computed_at && r.totals.payslips > 0 && can(PERMS.payroll.approve) && (
              <Button onClick={() => setDialog('approve')}>
                <CheckCircle2 aria-hidden /> {tr('Approve')}
              </Button>
            )}
            {r.status === 'approved' && can(PERMS.payroll.manage) && (
              <Button onClick={() => setDialog('paid')}>
                <Banknote aria-hidden /> {tr('Record payment')}
              </Button>
            )}
            {draft && can(PERMS.payroll.manage) && (
              <Button variant="outline" onClick={() => setDialog('cancel')} aria-label={tr('Cancel run')}>
                <Ban aria-hidden />
              </Button>
            )}
          </>
        }
      />

      {result && result.skipped.length > 0 && (
        <div className="mb-4 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" aria-hidden /> {pluralize(result.skipped.length, 'person', 'people')} {tr('left out')}
          </p>
          <ul className="ml-6 list-disc">
            {result.skipped.map((s) => (
              <li key={s.staff}>
                {s.staff_name}: {s.detail}
                {s.reason === 'no_salary' && (
                  <>
                    {' '}
                    <Link to={`/payroll/salaries?staff=${s.staff}`} className="underline">{tr('Assign a salary')}</Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={tr('Payslips')} value={r.totals.payslips} icon={Users} />
        <StatCard label={tr('Gross pay')} value={<Money value={r.totals.gross_pay} />} icon={Landmark} />
        <StatCard label={tr('Tax')} value={<Money value={r.totals.tax} />} icon={Landmark} />
        <StatCard label={tr('Net pay')} value={<Money value={r.totals.net_pay} />} icon={Banknote} hint={r.paid_at ? tr('Paid {dateTime}{value}', { dateTime: formatDateTime(r.paid_at), value: r.payment_reference ? ` · ${r.payment_reference}` : '' }) : r.approved_at ? tr('Approved {dateTime}', { dateTime: formatDateTime(r.approved_at) }) : undefined} />
      </div>

      {r.status === 'cancelled' && r.cancelled_reason && <p className="mb-4 rounded-lg border bg-muted p-3 text-sm">{tr('Cancelled: {cancelled_reason}', { cancelled_reason: r.cancelled_reason })}</p>}

      {!r.computed_at && draft ? (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          <p>{tr('Nothing worked out yet.')}</p>
          <p className="mt-1">{tr('Payslips come from each person’s salary, approved leave and attendance in the period. Recompute as often as you like until you approve.')}</p>
        </div>
      ) : (
        <DataTable
          ariaLabel={tr('Payslips')}
          columns={columns}
          query={slips}
          list={list}
          getRowId={(p) => p.id}
          searchPlaceholder={tr('Name, employee no. or payslip no.…')}
          onRowClick={(p) => navigate(`/payroll/payslips/${p.id}`)}
          empty={{ title: tr('No payslips'), description: tr('Nobody in this branch has a salary for the period.') }}
        />
      )}

      {r.status !== 'cancelled' && r.computed_at && <BankSheetSection run={r} />}

      <ConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={tr('Approve {name}?', { name: r.name })}
        description={
          <>
            {pluralize(r.totals.payslips, 'payslip')}{', ' + tr('net')} <Money value={r.totals.net_pay} />{tr('. Payslips are locked once approved, and staff can see theirs. Later corrections go in as adjustments on the next run.')}
          </>
        }
        confirmLabel={tr('Approve')}
        onConfirm={async () => {
          await approve.mutateAsync(r.id)
          toast.success(tr('Run approved.'))
        }}
      />
      <FormDialog
        open={dialog === 'paid'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={tr('Record the payment')}
        description={<>{tr('Net')} <Money value={r.totals.net_pay} /> {tr('to')} {pluralize(r.totals.payslips, 'person', 'people')}.</>}
        submitLabel={tr('Mark paid')}
        schema={z.object({ reference: z.string().max(100) })}
        defaultValues={{ reference: '' }}
        onSubmit={async (v) => {
          await markPaid.mutateAsync({ id: r.id, reference: v.reference })
          toast.success(tr('Run marked paid.'))
        }}
      >
        {({ register }) => (
          <FormField label={tr('Bank reference')}>
            <Input {...register('reference')} maxLength={100} placeholder={tr('Bulk transfer no.')} />
          </FormField>
        )}
      </FormDialog>
      <FormDialog
        open={dialog === 'cancel'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={tr('Cancel this run?')}
        description={tr('Its payslips stop counting; adjustments on them go back to waiting for the next run.')}
        submitLabel={tr('Cancel run')}
        schema={z.object({ reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await cancel.mutateAsync({ id: r.id, reason: v.reason })
          toast.success(tr('Run cancelled.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder={tr('Wrong dates')} />
          </FormField>
        )}
      </FormDialog>
    </div>
  )
}
