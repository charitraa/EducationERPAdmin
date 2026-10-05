import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

const TABS = [
  { to: '/finance', label: tr('Overview'), end: true },
  { to: '/finance/invoices', label: tr('Invoices') },
  { to: '/finance/payments', label: tr('Payments') },
  { to: '/finance/fees', label: tr('Fee structures') },
  { to: '/finance/scholarships', label: tr('Scholarships') },
  { to: '/finance/reports', label: tr('Reports') },
]

/** Fees, invoices, payments and scholarships under one sub-navigation. */
export function FinanceLayout() {
  return (
    <div>
      <PageHeader title={tr('Finance')} description={tr('What each student is billed, what they’ve paid, and what’s still owed.')} />
      <nav aria-label={tr('Finance')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
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
