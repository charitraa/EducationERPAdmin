import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { t, type MessageKey, tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const TABS: Array<{ path: string; label: MessageKey }> = [
  { path: 'programs', label: 'academics.programs' },
  { path: 'subjects', label: 'academics.subjects' },
  { path: 'curriculum', label: 'academics.curriculum' },
  { path: 'classes', label: 'academics.classes' },
  { path: 'electives', label: 'academics.electives' },
  { path: 'teaching', label: 'academics.teaching' },
  { path: 'academic-years', label: 'academics.academicYears' },
  { path: 'terms', label: 'academics.terms' },
  { path: 'rooms', label: 'academics.rooms' },
  { path: 'calendar', label: 'academics.calendar' },
  { path: 'departments', label: 'academics.departments' },
]

/** One Academics area with a sub-navigation, instead of nine sidebar entries. */
export function AcademicsLayout() {
  return (
    <div>
      <PageHeader title={t('nav.academics')} description={tr('How your school is organized: what is taught, to which classes, and when.')} />
      <nav aria-label={tr('Academics')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {TABS.map((tab) => (
            <li key={tab.path}>
              <NavLink
                to={tab.path}
                className={({ isActive }) =>
                  cn(
                    '-mb-px inline-flex border-b-2 px-3 py-2 text-sm transition-colors',
                    isActive ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {t(tab.label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
