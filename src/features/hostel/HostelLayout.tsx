import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/hostel', label: 'Bed board', end: true },
  { to: '/hostel/allocations', label: 'Allocations' },
  { to: '/hostel/rooms', label: 'Rooms & beds' },
  { to: '/hostel/buildings', label: 'Buildings' },
  { to: '/hostel/complaints', label: 'Complaints' },
]

/** Hostel: who sleeps where, the rooms themselves, and residents' complaints. */
export function HostelLayout() {
  return (
    <div>
      <PageHeader title="Hostel" description="Reserve beds, check residents in and out, keep the rooms, and follow up complaints." />
      <nav aria-label="Hostel" className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
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
