import { useMemo, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { SelectControl } from '@/components/forms/SelectControl'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import { rememberedSubject, rememberSubject, SubjectContext, useWho, type Subject } from './hooks/useSelf'
import { tr } from '@/lib/i18n'

interface Tab {
  to: string
  label: string
}

const STAFF_TABS: Tab[] = [
  { to: '/me/timetable', label: tr('Timetable') },
  { to: '/me/attendance', label: tr('Attendance') },
  { to: '/me/mark-sheets', label: tr('Marking') },
  { to: '/me/leave', label: tr('Leave') },
  { to: '/me/payslips', label: tr('Payslips') },
  { to: '/me/employment', label: tr('Employment') },
  { to: '/me/assets', label: tr('Assets') },
  { to: '/me/transport', label: tr('Transport') },
  { to: '/me/hostel', label: tr('Hostel') },
  { to: '/me/library', label: tr('Library') },
  { to: '/me/interviews', label: tr('Interviews') },
]

const STUDENT_TABS: Tab[] = [
  { to: '/me/timetable', label: tr('Timetable') },
  { to: '/me/attendance', label: tr('Attendance') },
  { to: '/me/exams', label: tr('Exams') },
  { to: '/me/results', label: tr('Results') },
  { to: '/me/fees', label: tr('Fees') },
  { to: '/me/library', label: tr('Library') },
  { to: '/me/hostel', label: tr('Hostel') },
  { to: '/me/transport', label: tr('Transport') },
  { to: '/me/events', label: tr('Events') },
  { to: '/me/certificates', label: tr('Certificates') },
]

const NONE: Subject = { kind: 'none' }

/**
 * Self-service: the signed-in person's own timetable, attendance, leave, pay,
 * results, fees and the rest. Which tabs show depends on the records the account
 * is linked to; a parent picks a child, and someone who is both staff and a
 * parent can switch between their own records and a child's.
 */
export function SelfLayout() {
  const { user } = useAuth()
  const { can } = usePermissions()
  const who = useWho()
  const { pathname } = useLocation()
  const [picked, setPicked] = useState(rememberedSubject)

  const subjects = useMemo(() => {
    const out: Array<{ value: string; label: string; subject: Subject }> = []
    if (who.staff) out.push({ value: 'staff', label: tr('My records (staff)'), subject: { kind: 'staff' } })
    if (who.student) out.push({ value: 'student', label: tr('My records'), subject: { kind: 'student', child: null, name: who.student.full_name } })
    for (const c of who.parent?.children ?? [])
      out.push({ value: `child-${c.student}`, label: c.full_name, subject: { kind: 'student', child: c.student, name: c.full_name } })
    return out
  }, [who.staff, who.student, who.parent])

  const current = subjects.find((s) => s.value === picked) ?? subjects[0]
  const pick = (value: string) => {
    setPicked(value)
    rememberSubject(value)
  }

  const tabs = useMemo(() => {
    const base: Tab[] = [{ to: '/me', label: tr('Profile') }]
    if (current?.subject.kind === 'staff') base.push(...STAFF_TABS.filter((t) => t.to !== '/me/mark-sheets' || can(PERMS.exams.mark)))
    if (current?.subject.kind === 'student')
      // A library card belongs to the student, not to a parent looking on.
      base.push(...STUDENT_TABS.filter((t) => t.to !== '/me/library' || (current.subject.kind === 'student' && current.subject.child == null)))
    if (who.student || who.alumnus) base.push({ to: '/me/mentoring', label: tr('Mentoring') })
    if (who.alumnus) base.push({ to: '/me/alumni-events', label: tr('Alumni events') })
    // Staff move between posts through HR; the vacancy form refuses them.
    if (!who.staff) base.push({ to: '/me/jobs', label: tr('Jobs') })
    base.push({ to: '/me/applications', label: tr('Applications') })
    return base
  }, [current, who.staff, who.student, who.alumnus, can])

  // Switching from a staff tab to a child (or back) can leave the page with nothing to show.
  const allowed = pathname === '/me' || tabs.some((t) => t.to !== '/me' && (pathname === t.to || pathname.startsWith(`${t.to}/`)))
  if (who.isPending) return <PageLoader />
  if (who.error) return <ErrorState error={who.error} />
  if (!allowed) return <Navigate to="/me" replace />

  return (
    <SubjectContext.Provider value={current?.subject ?? NONE}>
      <div>
        <PageHeader
          className="print:hidden"
          title={user?.full_name || tr('My account')}
          description={current?.subject.kind === 'student' && current.subject.child != null ? tr('Viewing {name}’s records.', { name: current.subject.name }) : tr('Your own records, in one place.')}
          actions={
            subjects.length > 1 ? (
              <div className="w-60">
                <SelectControl aria-label={tr('Whose records')} value={current?.value ?? ''} onChange={pick} options={subjects.map(({ value, label }) => ({ value, label }))} />
              </div>
            ) : undefined
          }
        />
        <nav aria-label={tr('My account')} className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0 print:hidden">
          <ul className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.to === '/me'}
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
        {/* Keyed so a page's own state (a chosen exam, a date range) resets with the person. */}
        <Outlet key={current?.value ?? 'none'} />
      </div>
    </SubjectContext.Provider>
  )
}
