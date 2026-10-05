import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

const TABS = [
  { to: '/payroll', label: tr('Runs'), end: true },
  { to: '/payroll/payslips', label: tr('Payslips') },
  { to: '/payroll/salaries', label: tr('Salaries') },
  { to: '/payroll/adjustments', label: tr('Adjustments') },
  { to: '/payroll/setup', label: tr('Setup') },
]

/** Payroll: monthly runs and their payslips, who is paid what, and the rules behind it. */
export function PayrollLayout() {
  return (
    <div>
      <PageHeader title={tr('Payroll')} description={tr('Work out each month’s pay from salaries, leave and attendance, approve it, and record the payment.')} />
      <nav aria-label={tr('Payroll')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
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
