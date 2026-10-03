import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionRequirement } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'

const TABS: Array<{ to: string; label: string; end?: boolean; permission?: PermissionRequirement }> = [
  { to: '/library', label: 'Desk', end: true, permission: PERMS.library.circulate },
  { to: '/library/books', label: 'Books' },
  { to: '/library/members', label: 'Members', permission: PERMS.library.manage },
  { to: '/library/loans', label: 'Loans' },
  { to: '/library/reservations', label: 'Reservations' },
  { to: '/library/fines', label: 'Fines' },
  { to: '/library/setup', label: 'Catalog setup', permission: PERMS.library.manage },
]

/** The library: the desk, the catalog, members, and what's out, held and owed. */
export function LibraryLayout() {
  const { can } = usePermissions()
  const tabs = TABS.filter((t) => can(t.permission))
  return (
    <div>
      <PageHeader title="Library" description="Issue and return at the desk, keep the catalog, and follow up loans, reservations and fines." />
      <nav aria-label="Library" className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => cn('-mb-px inline-flex border-b-2 px-3 py-2 text-sm transition-colors', isActive ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
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
