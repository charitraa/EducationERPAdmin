import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { Button } from '@/components/ui/button'
import { Money } from '@/features/finance/components/money'
import { usePermissions } from '@/hooks/usePermissions'
import { formatDate, todayIso } from '@/lib/dates'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import { usePayslips, useSalaries } from '../hooks/usePayroll'
import { AssignSalaryDialog } from '../pages/SalaryPages'

/** Staff → Payroll: the salary they're on and their latest payslips. Needs `payroll.view`. */
export function StaffPayroll({ staffId }: { staffId: Id }) {
  const { can } = usePermissions()
  const salaries = useSalaries({ ...PICKER_PARAMS, staff: staffId })
  const slips = usePayslips({ page_size: 4, staff: staffId })
  const [assigning, setAssigning] = useState(false)
  const today = todayIso()
  const current = (salaries.data?.results ?? []).find((s) => s.effective_from <= today && (!s.effective_to || s.effective_to >= today))
  return (
    <section className="rounded-lg border bg-card p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Payroll</h2>
        {can(PERMS.payroll.manage) && (
          <Button size="sm" variant="outline" className="h-7" onClick={() => setAssigning(true)}>
            <Plus aria-hidden /> Salary
          </Button>
        )}
      </div>
      {salaries.isPending ? (
        <TableSkeleton rows={2} columns={1} />
      ) : current ? (
        <p className="text-sm">
          <span className="font-medium">{current.structure_name}</span> · basic <Money value={current.monthly_basic} tone="none" />
          <span className="block text-xs text-muted-foreground">since {formatDate(current.effective_from)}</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No salary assigned; payroll runs leave them out.</p>
      )}
      {(slips.data?.results ?? []).length > 0 && (
        <ul className="mt-3 divide-y border-t text-sm">
          {slips.data!.results.map((p) => (
            <li key={p.id}>
              <Link to={`/payroll/payslips/${p.id}`} className="flex justify-between gap-2 py-1.5 hover:underline">
                <span>{p.run_name}</span>
                <Money value={p.net_pay} tone="none" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <AssignSalaryDialog open={assigning} staffId={staffId} onOpenChange={setAssigning} />
    </section>
  )
}
