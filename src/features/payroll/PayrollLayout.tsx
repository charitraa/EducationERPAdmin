import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/payroll', label: 'Runs', end: true },
  { to: '/payroll/payslips', label: 'Payslips' },
  { to: '/payroll/salaries', label: 'Salaries' },
  { to: '/payroll/adjustments', label: 'Adjustments' },
  { to: '/payroll/setup', label: 'Setup' },
]

/** Payroll: monthly runs and their payslips, who is paid what, and the rules behind it. */
export function PayrollLayout() {
  return (
    <div>
      <PageHeader title="Payroll" description="Work out each month’s pay from salaries, leave and attendance, approve it, and record the payment." />
      <nav aria-label="Payroll" className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink to={tab.to} end={tab.end} className={({ isActive }) => cn('-mb-px inline-flex border-b-2 px-3 py-2 text-sm transition-colors', isActive ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
