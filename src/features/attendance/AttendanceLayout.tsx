import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionRequirement } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import { tr } from '@/lib/i18n'

const TABS: Array<{ to: string; label: string; end?: boolean; permission?: PermissionRequirement }> = [
  { to: '/attendance', label: tr('Today'), end: true },
  { to: '/attendance/sessions', label: tr('Sessions'), permission: PERMS.attendance.view },
  { to: '/attendance/reports', label: tr('Reports'), permission: PERMS.attendance.view },
  { to: '/attendance/staff', label: tr('Staff'), permission: PERMS.attendance.view },
  { to: '/attendance/schedules', label: tr('Work schedules'), permission: PERMS.attendance.view },
  { to: '/attendance/devices', label: tr('Devices'), permission: PERMS.attendance.devices },
]

/** Student roll calls, registers and reports, and staff attendance, under one sub-navigation. */
export function AttendanceLayout() {
  const { can } = usePermissions()
  const tabs = TABS.filter((t) => can(t.permission))
  return (
    <div>
      <PageHeader title={tr('Attendance')} description={tr('Roll calls for every class and lesson, registers and defaulters, and staff check-ins.')} />
      {tabs.length > 1 && (
        <nav aria-label={tr('Attendance')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-1">
            {tabs.map((tab) => (
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
      )}
      <Outlet />
    </div>
  )
}
