import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/events', label: 'Events', end: true },
  { to: '/events/leaderboard', label: 'Leaderboard' },
  { to: '/events/awards', label: 'Awards' },
  { to: '/events/point-rules', label: 'Point rules' },
  { to: '/events/categories', label: 'Categories' },
]

/** Events, and the points and awards students earn from them, under one sub-navigation. */
export function EventsLayout() {
  const { can } = usePermissions()
  const tabs = can('events.view') ? TABS : TABS.slice(0, 1)
  return (
    <div>
      <PageHeader title="Events" description="Sports days, competitions and programs: sign-ups, check-in, results, and the points and awards they earn." />
      <nav aria-label="Events" className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    '-mb-px inline-flex border-b-2 px-3 py-2 text-sm transition-colors',
                    isActive ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )
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
