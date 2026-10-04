import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/careers', label: 'Vacancies', end: true },
  { to: '/careers/applications', label: 'Candidates' },
  { to: '/careers/interviews', label: 'Interviews' },
  { to: '/careers/offers', label: 'Offers' },
  { to: '/careers/board', label: 'Job board' },
]

/** Careers: the school's own hiring, and a job board for students and alumni. */
export function CareersLayout() {
  return (
    <div>
      <PageHeader title="Careers" description="Advertise vacancies, screen and interview candidates, make offers and hire, and run the job board." />
      <nav aria-label="Careers" className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
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
