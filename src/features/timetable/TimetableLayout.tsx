import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

const TABS = [
  { to: '/timetable', label: tr('Week'), end: true },
  { to: '/timetable/day', label: tr('Day') },
  { to: '/timetable/lesson-changes', label: tr('Lesson changes') },
  { to: '/timetable/bell-schedules', label: tr('Bell schedules') },
]

export function TimetableLayout() {
  return (
    <div>
      <PageHeader title={tr('Timetable')} description={tr('Who teaches what, where and when; and today’s cover and cancellations.')} />
      <nav aria-label={tr('Timetable')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
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
