import { AlertTriangle, Clock, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Money } from '@/features/finance/components/money'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { optionalWholeNumber } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Payslip, PayslipLine, PayslipRow } from '../api/payroll.api'
import { usePayslip, usePayslips, useRuns, useSetOvertime } from '../hooks/usePayroll'
import { RunStatus } from './RunPages'
import { tr } from '@/lib/i18n'

/** Every payslip across runs, by person or run. */
export function PayslipsPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['run', 'staff'] })
  const query = usePayslips(list.query)
  const runs = useRuns({ ...PICKER_PARAMS })
  const staff = useStaffOptions()
  const columns: Column<PayslipRow>[] = [
    { id: 'number', header: tr('Payslip'), className: 'font-mono text-xs', cell: (p) => p.number },
    { id: 'who', header: tr('Staff member'), mobile: 'title', cell: (p) => <span className="font-medium">{p.staff_name}</span> },
    { id: 'run', header: tr('Run'), cell: (p) => p.run_name },
    { id: 'gross', header: tr('Gross'), className: 'text-right', cell: (p) => <Money value={p.gross_pay} /> },
    { id: 'deductions', header: tr('Deductions'), mobile: 'hidden', className: 'text-right', cell: (p) => <Money value={p.total_deductions} /> },
    { id: 'net', header: tr('Net pay'), className: 'text-right font-medium', cell: (p) => <Money value={p.net_pay} /> },
    { id: 'status', header: tr('Run status'), cell: (p) => <RunStatus status={p.run_status} /> },
  ]
  return (
    <DataTable
      ariaLabel={tr('Payslips')}
      columns={columns}
      query={query}
      list={list}
      getRowId={(p) => p.id}
      searchPlaceholder={tr('Name, employee no. or payslip no.…')}
      onRowClick={(p) => navigate(`/payroll/payslips/${p.id}`)}
      filters={[
        { name: 'run', label: tr('Run'), options: (runs.data?.results ?? []).map((r) => ({ value: String(r.id), label: r.name })) },
        { name: 'staff', label: tr('Staff member'), options: staff.data ?? [], hidden: !staff.canPick },
      ]}
      empty={{ title: tr('No payslips yet'), description: tr('They’re made when a payroll run is worked out.') }}
    />
  )
}

function Lines({ title, lines, total }: { title: string; lines: PayslipLine[]; total: string }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <table className="w-full text-sm">
        <tbody className="divide-y">
          {lines.length === 0 ? (
            <tr>
              <td className="py-1.5 text-muted-foreground">{tr('None')}</td>
            </tr>
          ) : (
            lines.map((l) => (
              <tr key={l.id}>
                <td className="py-1.5">
                  {l.description}
                  {l.is_pre_tax && <span className="ml-1 text-xs text-muted-foreground">{tr('before tax')}</span>}
                </td>
                <td className="py-1.5 text-right">
                  <Money value={l.amount} tone="none" />
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="border-t font-medium">
            <td className="py-1.5">{tr('Total')}</td>
            <td className="py-1.5 text-right">
              <Money value={total} tone="none" />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

const hours = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`

/** The payslip itself (printable), then the days off behind it. Shared with the staff member's own view. */
export function PayslipDocument({ p, staffHref }: { p: Payslip; staffHref?: string }) {
  const { user } = useAuth()
  const lines = p.lines ?? []
  const earnings = lines.filter((l) => l.kind === 'earning')
  // Unpaid days and tax are deductions too; the backend counts tax inside total_deductions.
  const deductions = lines.filter((l) => l.kind === 'deduction')
  const overtime = p.overtime_minutes_override ?? p.overtime_minutes ?? 0
  const days = (p.details?.days ?? []).filter((d) => d.leave || d.attendance)
  return (
    <>
      <article className="rounded-lg border bg-card p-6 print:border-0 print:p-0">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
          <div>
            <p className="text-lg font-semibold">{user?.organization?.name}</p>
            <p className="text-sm text-muted-foreground">
              {tr('Payslip · {date} – {date2}', { date: formatDate(p.period_start), date2: formatDate(p.period_end) })}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-medium">{p.number}</p>
            <p>
              {staffHref ? (
                <Link to={staffHref} className="font-medium hover:underline print:no-underline">
                  {p.staff_name}
                </Link>
              ) : (
                <span className="font-medium">{p.staff_name}</span>
              )}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{p.employee_number}</p>
          </div>
        </header>
        <dl className="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {(
            [
              [tr('Working days'), p.working_days],
              [tr('Worked'), p.worked_days],
              [tr('Paid leave'), p.paid_leave_days],
              [tr('Unpaid leave'), p.unpaid_leave_days],
              [tr('Absent'), p.absent_days],
              [tr('Not employed'), p.not_employed_days],
            ] as const
          )
            .filter(([label, v]) => label === 'Working days' || label === 'Worked' || Number(v) > 0)
            .map(([label, v]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="tabular-nums">{Number(v)}</dd>
              </div>
            ))}
          {overtime > 0 && (
            <div>
              <dt className="text-xs text-muted-foreground">{tr('Overtime')}{p.overtime_minutes_override != null ? ' ' + tr('(set by hand)') : ''}</dt>
              <dd className="tabular-nums">{hours(overtime)}</dd>
            </div>
          )}
        </dl>
        <div className="grid gap-6 sm:grid-cols-2">
          <Lines title={tr('Earnings')} lines={earnings} total={p.gross_pay ?? '0'} />
          <Lines title={tr('Deductions')} lines={deductions} total={p.total_deductions ?? '0'} />
        </div>
        <p className="mt-6 flex items-baseline justify-between border-y py-3">
          <span className="text-sm text-muted-foreground">{tr('Net pay')}</span>
          <Money value={p.net_pay} className="text-2xl font-semibold" tone="none" />
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {tr('Taxable income this period')} <Money value={p.taxable_income} tone="none" /> {'· ' + tr('a day’s pay is the monthly amount ÷ {basis_days} days.', { basis_days: p.basis_days })}
        </p>
      </article>
      {days.length > 0 && (
        <section className="mt-6 print:hidden">
          <h2 className="mb-2 text-sm font-semibold">{tr('Days off and absences')}</h2>
          <ul className="divide-y rounded-lg border bg-card text-sm">
            {days.map((d) => (
              <li key={d.date} className="flex justify-between gap-3 px-4 py-1.5">
                <span className="tabular-nums">{formatDate(d.date)}</span>
                <span className="text-muted-foreground">
                  {d.leave ? `${d.leave}${d.days && Number(d.days) !== 1 ? ` (${Number(d.days)} day)` : ''}${d.paid === false ? ' · unpaid' : ''}` : enumLabel('AttendanceStatusEnum', d.attendance)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/** One payslip, laid out to print, with the days behind it. */
export function PayslipPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const slip = usePayslip(Number.isFinite(id) ? id : null)
  const setOvertime = useSetOvertime()
  const { can } = usePermissions()
  const [editingOvertime, setEditingOvertime] = useState(false)
  if (slip.isPending) return <PageLoader />
  if (slip.isError) return <ErrorState error={slip.error} onRetry={() => void slip.refetch()} />
  const p = slip.data
  const draft = p.run_status === 'draft'
  const warnings = p.details?.warnings ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        className="print:hidden"
        backTo={`/payroll/runs/${p.run}`}
        title={tr('Payslip {number}', { number: p.number })}
        description={
          <span className="inline-flex items-center gap-2">
            {p.run_name} <RunStatus status={p.run_status} />
          </span>
        }
        actions={
          <>
            {draft && can(PERMS.payroll.manage) && (
              <Button variant="outline" onClick={() => setEditingOvertime(true)}>
                <Clock aria-hidden /> {tr('Overtime')}
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden /> {tr('Print')}
            </Button>
          </>
        }
      />
      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm print:hidden">
          {warnings.map((w) => (
            <p key={w} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w}
            </p>
          ))}
        </div>
      )}
      <PayslipDocument p={p} staffHref={`/staff/${p.staff}`} />
      <FormDialog
        open={editingOvertime}
        onOpenChange={setEditingOvertime}
        title={tr('Overtime for this payslip')}
        description={tr('Counted from attendance: {hours}. Leave empty to go back to the count.', { hours: hours(p.overtime_minutes ?? 0) })}
        schema={z.object({ minutes: optionalWholeNumber })}
        defaultValues={{ minutes: p.overtime_minutes_override != null ? String(p.overtime_minutes_override) : '' }}
        onSubmit={async (v) => {
          const next = await setOvertime.mutateAsync({ id: p.id, minutes: v.minutes === '' ? null : Number(v.minutes) })
          toast.success(tr('Overtime set; payslip recomputed.'))
          // The backend rebuilds the payslip (same number, new id).
          if (next.id !== p.id) navigate(`/payroll/payslips/${next.id}`, { replace: true })
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Minutes')} error={errors.minutes?.message}>
            <Input {...register('minutes')} inputMode="numeric" placeholder={String(p.overtime_minutes ?? 0)} />
          </FormField>
        )}
      </FormDialog>
    </div>
  )
}
