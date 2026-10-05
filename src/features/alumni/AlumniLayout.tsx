import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

const TABS = [
  { to: '/alumni', label: tr('Directory'), end: true },
  { to: '/alumni/mentors', label: tr('Mentors') },
  { to: '/alumni/events', label: tr('Events') },
  { to: '/alumni/campaigns', label: tr('Campaigns') },
  { to: '/alumni/donations', label: tr('Donations') },
]

/** Alumni: graduates and their records, mentoring, events and giving. */
export function AlumniLayout() {
  return (
    <div>
      <PageHeader title={tr('Alumni')} description={tr('Keep in touch with graduates: where they are now, mentoring, reunions and fundraising.')} />
      <nav aria-label={tr('Alumni')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
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
