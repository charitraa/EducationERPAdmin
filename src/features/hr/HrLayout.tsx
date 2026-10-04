import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'

const TABS = [
  { to: '/hr', label: 'Leave requests', end: true },
  { to: '/hr/leave', label: 'Leave balances', viewOnly: true },
  { to: '/hr/contracts', label: 'Contracts', viewOnly: true },
  { to: '/hr/profiles', label: 'HR profiles', viewOnly: true },
  { to: '/hr/documents', label: 'Documents', viewOnly: true },
  { to: '/hr/setup', label: 'Setup', viewOnly: true },
]

/** HR: leave, contracts, profiles and documents. An approver without `hr.view` sees only the leave queue. */
export function HrLayout() {
  const { can } = usePermissions()
  const tabs = TABS.filter((t) => !t.viewOnly || can(PERMS.hr.view))
  return (
    <div>
      <PageHeader title="HR" description="Decide leave, keep everyone’s terms of employment and the details payroll relies on." />
      {tabs.length > 1 && (
        <nav aria-label="HR" className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <NavLink to={tab.to} end={tab.end} className={({ isActive }) => cn('-mb-px inline-flex border-b-2 px-3 py-2 text-sm transition-colors', isActive ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <Outlet />
    </div>
  )
}
