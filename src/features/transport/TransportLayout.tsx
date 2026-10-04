import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/transport', label: 'Trips', end: true },
  { to: '/transport/routes', label: 'Routes & stops' },
  { to: '/transport/assignments', label: 'Riders' },
  { to: '/transport/vehicles', label: 'Vehicles' },
  { to: '/transport/crew', label: 'Crew' },
]

/** School transport: the day's trips, routes and stops, riders, and the fleet. */
export function TransportLayout() {
  return (
    <div>
      <PageHeader title="Transport" description="Run each day’s pickups and drops, keep routes and riders, and look after the fleet and its papers." />
      <nav aria-label="Transport" className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
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
