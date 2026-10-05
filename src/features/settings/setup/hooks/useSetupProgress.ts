import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useCount } from '@/shared/api/count'
import { PERMS } from '@/shared/constants/permissions'
import { useMyOrganization } from '../../organization/hooks/useOrganization'
import { hasSchoolDetails } from '../../organization/schemas/organization.schema'
import { tr } from '@/lib/i18n'

export type SetupStepId = 'school' | 'year' | 'programs' | 'classes' | 'staff' | 'students' | 'modules'

export interface SetupStep {
  id: SetupStepId
  title: string
  summary: string
  done: boolean
  skipped: boolean
  loading: boolean
}

/*
 * Progress is read from the real data (is there an academic year? a class?),
 * so it can't drift from what the school actually has. Only "skipped" and
 * "dismissed" are remembered, per organization, in this browser.
 */
const STORE_KEY = (org: number) => `erp.setup.${org}`
interface Stored {
  skipped: SetupStepId[]
  dismissed: boolean
  modulesReviewed: boolean
}
const EMPTY: Stored = { skipped: [], dismissed: false, modulesReviewed: false }
const listeners = new Set<() => void>()
const cache = new Map<number, Stored>()

function read(org: number): Stored {
  if (!cache.has(org)) {
    try {
      cache.set(org, { ...EMPTY, ...JSON.parse(localStorage.getItem(STORE_KEY(org)) ?? '{}') })
    } catch {
      cache.set(org, EMPTY)
    }
  }
  return cache.get(org)!
}

function write(org: number, next: Stored) {
  cache.set(org, next)
  try {
    localStorage.setItem(STORE_KEY(org), JSON.stringify(next))
  } catch {
    // per-browser convenience only
  }
  listeners.forEach((l) => l())
}

export function useSetupProgress() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const orgId = user?.organization?.id ?? 0
  const stored = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => read(orgId),
  )

  const canAcademics = hasPermission(PERMS.academics.view)
  const org = useMyOrganization(hasPermission(PERMS.organizations.view))
  const years = useCount('academic-years', '/academic-years/', {}, canAcademics)
  const programs = useCount('programs', '/programs/', {}, canAcademics)
  const subjects = useCount('subjects', '/subjects/', {}, canAcademics)
  const curriculum = useCount('curriculum', '/curriculum/', {}, canAcademics)
  const classes = useCount('sections', '/sections/', {}, canAcademics)
  const staff = useCount('staff', '/staff/', {}, hasPermission(PERMS.staff.view))
  const students = useCount('students', '/students/', {}, hasPermission(PERMS.students.view))

  const steps = useMemo<SetupStep[]>(() => {
    const step = (id: SetupStepId, title: string, summary: string, done: boolean, loading: boolean): SetupStep => ({
      id,
      title,
      summary,
      done,
      loading,
      skipped: !done && stored.skipped.includes(id),
    })
    return [
      step('school', tr('School details'), tr('Name, address and how to reach you'), hasSchoolDetails(org.data), org.isLoading),
      step('year', tr('Academic year'), tr('The year you teach now, and its terms'), (years.data ?? 0) > 0, years.isLoading),
      step(
        'programs',
        tr('Programs & subjects'),
        tr('What you teach, and which level takes which subject'),
        (programs.data ?? 0) > 0 && (subjects.data ?? 0) > 0 && (curriculum.data ?? 0) > 0,
        programs.isLoading || subjects.isLoading || curriculum.isLoading,
      ),
      step('classes', tr('Classes'), tr('Grade 11 A, Grade 11 B… for this year'), (classes.data ?? 0) > 0, classes.isLoading),
      step('staff', tr('Staff & logins'), tr('Your teachers and office, and who can sign in'), (staff.data ?? 0) > 0, staff.isLoading),
      step('students', tr('Students & parents'), tr('Admit students or add them directly'), (students.data ?? 0) > 0, students.isLoading),
      step('modules', tr('Turn on more'), tr('Fees, exams, timetable, library and more'), stored.modulesReviewed, false),
    ]
  }, [org.data, org.isLoading, years, programs, subjects, curriculum, classes, staff, students, stored])

  const setSkipped = useCallback(
    (id: SetupStepId, skipped: boolean) => {
      const cur = read(orgId)
      write(orgId, { ...cur, skipped: skipped ? [...new Set([...cur.skipped, id])] : cur.skipped.filter((s) => s !== id) })
    },
    [orgId],
  )

  const completed = steps.filter((s) => s.done).length
  return {
    steps,
    completed,
    total: steps.length,
    isComplete: steps.every((s) => s.done || s.skipped),
    isLoading: steps.some((s) => s.loading),
    dismissed: stored.dismissed,
    /** The first step neither done nor skipped: where "Continue setup" goes. */
    nextStep: steps.find((s) => !s.done && !s.skipped) ?? null,
    skip: (id: SetupStepId) => setSkipped(id, true),
    unskip: (id: SetupStepId) => setSkipped(id, false),
    dismiss: () => write(orgId, { ...read(orgId), dismissed: true }),
    markModulesReviewed: () => write(orgId, { ...read(orgId), modulesReviewed: true }),
  }
}
