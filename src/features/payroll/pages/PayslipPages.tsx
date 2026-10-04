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
import type { PayslipLine, PayslipRow } from '../api/payroll.api'
import { usePayslip, usePayslips, useRuns, useSetOvertime } from '../hooks/usePayroll'
import { RunStatus } from './RunPages'

/** Every payslip across runs, by person or run. */
export function PayslipsPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['run', 'staff'] })
  const query = usePayslips(list.query)
  const runs = useRuns({ ...PICKER_PARAMS })
  const staff = useStaffOptions()
  const columns: Column<PayslipRow>[] = [
    { id: 'number', header: 'Payslip', className: 'font-mono text-xs', cell: (p) => p.number },
    { id: 'who', header: 'Staff member', mobile: 'title', cell: (p) => <span className="font-medium">{p.staff_name}</span> },
    { id: 'run', header: 'Run', cell: (p) => p.run_name },
    { id: 'gross', header: 'Gross', className: 'text-right', cell: (p) => <Money value={p.gross_pay} /> },
    { id: 'deductions', header: 'Deductions', mobile: 'hidden', className: 'text-right', cell: (p) => <Money value={p.total_deductions} /> },
    { id: 'net', header: 'Net pay', className: 'text-right font-medium', cell: (p) => <Money value={p.net_pay} /> },
    { id: 'status', header: 'Run status', cell: (p) => <RunStatus status={p.run_status} /> },
  ]
  return (
    <DataTable
      ariaLabel="Payslips"
      columns={columns}
      query={query}
      list={list}
      getRowId={(p) => p.id}
      searchPlaceholder="Name, employee no. or payslip no.…"
      onRowClick={(p) => navigate(`/payroll/payslips/${p.id}`)}
      filters={[
        { name: 'run', label: 'Run', options: (runs.data?.results ?? []).map((r) => ({ value: String(r.id), label: r.name })) },
        { name: 'staff', label: 'Staff member', options: staff.data ?? [], hidden: !staff.canPick },
      ]}
      empty={{ title: 'No payslips yet', description: 'They’re made when a payroll run is worked out.' }}
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
              <td className="py-1.5 text-muted-foreground">None</td>
            </tr>
          ) : (
            lines.map((l) => (
              <tr key={l.id}>
                <td className="py-1.5">
                  {l.description}
                  {l.is_pre_tax && <span className="ml-1 text-xs text-muted-foreground">before tax</span>}
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
            <td className="py-1.5">Total</td>
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

/** One payslip, laid out to print, with the days behind it. */
export function PayslipPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const slip = usePayslip(Number.isFinite(id) ? id : null)
  const setOvertime = useSetOvertime()
  const { user } = useAuth()
  const { can } = usePermissions()
  const [editingOvertime, setEditingOvertime] = useState(false)
  if (slip.isPending) return <PageLoader />
  if (slip.isError) return <ErrorState error={slip.error} onRetry={() => void slip.refetch()} />
  const p = slip.data
  const lines = p.lines ?? []
  const earnings = lines.filter((l) => l.kind === 'earning')
  // Unpaid days and tax are deductions too; the backend counts tax inside total_deductions.
  const deductions = lines.filter((l) => l.kind === 'deduction')
  const draft = p.run_status === 'draft'
  const overtime = p.overtime_minutes_override ?? p.overtime_minutes ?? 0
  const warnings = p.details?.warnings ?? []
  const days = (p.details?.days ?? []).filter((d) => d.leave || d.attendance)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        className="print:hidden"
        backTo={`/payroll/runs/${p.run}`}
        title={`Payslip ${p.number}`}
        description={
          <span className="inline-flex items-center gap-2">
            {p.run_name} <RunStatus status={p.run_status} />
          </span>
        }
        actions={
          <>
            {draft && can(PERMS.payroll.manage) && (
              <Button variant="outline" onClick={() => setEditingOvertime(true)}>
                <Clock aria-hidden /> Overtime
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden /> Print
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
      <article className="rounded-lg border bg-card p-6 print:border-0 print:p-0">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
          <div>
            <p className="text-lg font-semibold">{user?.organization?.name}</p>
            <p className="text-sm text-muted-foreground">
              Payslip · {formatDate(p.period_start)} – {formatDate(p.period_end)}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-medium">{p.number}</p>
            <p>
              <Link to={`/staff/${p.staff}`} className="font-medium hover:underline print:no-underline">
                {p.staff_name}
              </Link>
            </p>
            <p className="font-mono text-xs text-muted-foreground">{p.employee_number}</p>
          </div>
        </header>
        <dl className="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {(
            [
              ['Working days', p.working_days],
              ['Worked', p.worked_days],
              ['Paid leave', p.paid_leave_days],
              ['Unpaid leave', p.unpaid_leave_days],
              ['Absent', p.absent_days],
              ['Not employed', p.not_employed_days],
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
              <dt className="text-xs text-muted-foreground">Overtime{p.overtime_minutes_override != null ? ' (set by hand)' : ''}</dt>
              <dd className="tabular-nums">{hours(overtime)}</dd>
            </div>
          )}
        </dl>
        <div className="grid gap-6 sm:grid-cols-2">
          <Lines title="Earnings" lines={earnings} total={p.gross_pay ?? '0'} />
          <Lines title="Deductions" lines={deductions} total={p.total_deductions ?? '0'} />
        </div>
        <p className="mt-6 flex items-baseline justify-between border-y py-3">
          <span className="text-sm text-muted-foreground">Net pay</span>
          <Money value={p.net_pay} className="text-2xl font-semibold" tone="none" />
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Taxable income this period <Money value={p.taxable_income} tone="none" /> · a day’s pay is the monthly amount ÷ {p.basis_days} days.
        </p>
      </article>
      {days.length > 0 && (
        <section className="mt-6 print:hidden">
          <h2 className="mb-2 text-sm font-semibold">Days off and absences</h2>
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
      <FormDialog
        open={editingOvertime}
        onOpenChange={setEditingOvertime}
        title="Overtime for this payslip"
        description={`Counted from attendance: ${hours(p.overtime_minutes ?? 0)}. Leave empty to go back to the count.`}
        schema={z.object({ minutes: optionalWholeNumber })}
        defaultValues={{ minutes: p.overtime_minutes_override != null ? String(p.overtime_minutes_override) : '' }}
        onSubmit={async (v) => {
          const next = await setOvertime.mutateAsync({ id: p.id, minutes: v.minutes === '' ? null : Number(v.minutes) })
          toast.success('Overtime set; payslip recomputed.')
          // The backend rebuilds the payslip (same number, new id).
          if (next.id !== p.id) navigate(`/payroll/payslips/${next.id}`, { replace: true })
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label="Minutes" error={errors.minutes?.message}>
            <Input {...register('minutes')} inputMode="numeric" placeholder={String(p.overtime_minutes ?? 0)} />
          </FormField>
        )}
      </FormDialog>
    </div>
  )
}
