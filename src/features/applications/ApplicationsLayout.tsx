import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import { usePendingApplications } from './hooks/useApplications'
import { tr } from '@/lib/i18n'

/** Requests of every kind, each through its own chain of approvals. Anyone may apply and decide their own steps. */
export function ApplicationsLayout() {
  const { can } = usePermissions()
  const office = can(PERMS.applications.view)
  const waiting = usePendingApplications({ page_size: 1 })
  const count = waiting.data?.count ?? 0
  const tabs = [
    { to: '/applications', label: tr('Waiting for me'), end: true, badge: count },
    ...(office ? [{ to: '/applications/all', label: tr('All applications') }] : []),
    { to: '/applications/mine', label: tr('Mine') },
    ...(office ? [{ to: '/applications/types', label: tr('Forms') }] : []),
  ]
  return (
    <div>
      <PageHeader title={tr('Applications')} description={tr('Certificates, leave, hostel, transport, scholarships and other requests, each through its approval steps.')} />
      <nav aria-label={tr('Applications')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink to={tab.to} end={'end' in tab} className={({ isActive }) => cn('-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors', isActive ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                {tab.label}
                {'badge' in tab && tab.badge ? <span className="rounded-full bg-warning-soft px-1.5 text-xs font-medium tabular-nums text-warning">{tab.badge}</span> : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
