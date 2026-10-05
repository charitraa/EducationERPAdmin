import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionRequirement } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import { tr } from '@/lib/i18n'

const TABS: Array<{ to: string; label: string; end?: boolean; permission?: PermissionRequirement }> = [
  { to: '/library', label: tr('Desk'), end: true, permission: PERMS.library.circulate },
  { to: '/library/books', label: tr('Books') },
  { to: '/library/members', label: tr('Members'), permission: PERMS.library.manage },
  { to: '/library/loans', label: tr('Loans') },
  { to: '/library/reservations', label: tr('Reservations') },
  { to: '/library/fines', label: tr('Fines') },
  { to: '/library/setup', label: tr('Catalog setup'), permission: PERMS.library.manage },
]

/** The library: the desk, the catalog, members, and what's out, held and owed. */
export function LibraryLayout() {
  const { can } = usePermissions()
  const tabs = TABS.filter((t) => can(t.permission))
  return (
    <div>
      <PageHeader title={tr('Library')} description={tr('Issue and return at the desk, keep the catalog, and follow up loans, reservations and fines.')} />
      <nav aria-label={tr('Library')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
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
