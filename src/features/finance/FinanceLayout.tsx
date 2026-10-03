import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/finance', label: 'Overview', end: true },
  { to: '/finance/invoices', label: 'Invoices' },
  { to: '/finance/payments', label: 'Payments' },
  { to: '/finance/fees', label: 'Fee structures' },
  { to: '/finance/scholarships', label: 'Scholarships' },
  { to: '/finance/reports', label: 'Reports' },
]

/** Fees, invoices, payments and scholarships under one sub-navigation. */
export function FinanceLayout() {
  return (
    <div>
      <PageHeader title="Finance" description="What each student is billed, what they’ve paid, and what’s still owed." />
      <nav aria-label="Finance" className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn('-mb-px inline-flex border-b-2 px-3 py-2 text-sm transition-colors', isActive ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')
                }
              >
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
