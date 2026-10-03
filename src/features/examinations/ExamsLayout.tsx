import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionRequirement } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'

const TABS: Array<{ to: string; label: string; end?: boolean; permission: PermissionRequirement }> = [
  { to: '/examinations', label: 'Exams', end: true, permission: PERMS.exams.view },
  { to: '/examinations/mark-sheets', label: 'Mark sheets', permission: { any: [PERMS.exams.view, PERMS.exams.mark] } },
  { to: '/examinations/results', label: 'Results', permission: PERMS.exams.view },
  { to: '/examinations/term-results', label: 'Term results', permission: PERMS.exams.view },
  { to: '/examinations/report-cards', label: 'Report cards', permission: PERMS.exams.view },
  { to: '/examinations/transcripts', label: 'Transcripts', permission: PERMS.exams.view },
  { to: '/examinations/grades', label: 'Grade scales', permission: PERMS.grades.view },
  { to: '/examinations/types', label: 'Exam types', permission: PERMS.exams.view },
]

/** A teacher who only enters marks lands on their mark sheets instead of the exam list. */
export function ExamsIndexGate({ children }: { children: React.ReactNode }) {
  const { can } = usePermissions()
  return can(PERMS.exams.view) ? <>{children}</> : <Navigate to="/examinations/mark-sheets" replace />
}

/** Exams, marks, results and the records made from them, under one sub-navigation. */
export function ExamsLayout() {
  const { can } = usePermissions()
  const tabs = TABS.filter((t) => can(t.permission))
  return (
    <div>
      <PageHeader title="Examinations" description="Set up and schedule exams, enter and verify marks, then publish results, report cards and transcripts." />
      {tabs.length > 1 && (
        <nav aria-label="Examinations" className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
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
