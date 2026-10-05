import { useQuery } from '@tanstack/react-query'
import { usePermissions } from '@/hooks/usePermissions'
import { useCount } from '@/shared/api/count'
import { toApiError } from '@/shared/api/errors'
import { PERMS } from '@/shared/constants/permissions'
import { useUnreadCount } from '@/features/notifications/hooks/useNotifications'
import { dashboardApi, dashboardKeys } from '../api/dashboard.api'
import { tr } from '@/lib/i18n'

/** 404 here means "no staff profile linked": nothing to do, not an error. */
const zeroOn404 = async <T,>(fn: () => Promise<T>, empty: T): Promise<T> => {
  try {
    return await fn()
  } catch (err) {
    if (toApiError(err).status === 404) return empty
    throw err
  }
}

export interface InboxSource {
  key: string
  label: string
  count: number | undefined
  loading: boolean
  error: boolean
  to: string
}

/**
 * "Waiting for me": everything that needs this person's action, from five
 * endpoints, in one place. Sources the user can't reach are left out.
 */
export function useWaitingForMe() {
  const { hasPermission } = usePermissions()
  const canMark = hasPermission(PERMS.exams.mark)
  const canRollCall = hasPermission(PERMS.attendance.mark)
  const canApproveLeave = hasPermission(PERMS.hr.approveLeave)

  const applications = useCount('applications', '/applications/pending/')
  const leave = useCount('leave-requests', '/hr/leave-requests/pending/', {}, canApproveLeave)
  const markSheets = useQuery({
    queryKey: dashboardKeys.myMarkSheets,
    queryFn: () => zeroOn404(dashboardApi.myMarkSheets, []),
    enabled: canMark,
    select: (rows) => rows.filter((r) => r.held && (r.status === null || r.status === 'open')).length,
  })
  const rollCalls = useQuery({
    queryKey: dashboardKeys.myRollCalls,
    queryFn: () => zeroOn404(dashboardApi.myRollCalls, { date: '', classes: [] }),
    enabled: canRollCall,
    select: (d) => d.classes.filter((c) => c.status !== 'submitted').length,
  })
  const notifications = useUnreadCount()

  const sources: InboxSource[] = [
    { key: 'applications', label: tr('Applications to decide'), count: applications.data, loading: applications.isLoading, error: applications.isError, to: '/applications/pending' },
    ...(canApproveLeave
      ? [{ key: 'leave', label: tr('Leave requests'), count: leave.data, loading: leave.isLoading, error: leave.isError, to: '/hr/leave-requests' }]
      : []),
    ...(canMark
      ? [{ key: 'marks', label: tr('Mark sheets to fill'), count: markSheets.data, loading: markSheets.isLoading, error: markSheets.isError, to: '/examinations/mark-sheets' }]
      : []),
    ...(canRollCall
      ? [{ key: 'rollcall', label: tr("Today's roll calls"), count: rollCalls.data, loading: rollCalls.isLoading, error: rollCalls.isError, to: '/attendance' }]
      : []),
    { key: 'notifications', label: tr('Unread notifications'), count: notifications.data, loading: notifications.isLoading, error: notifications.isError, to: '/notifications' },
  ]

  return {
    sources,
    total: sources.reduce((sum, s) => sum + (s.count ?? 0), 0),
    loading: sources.some((s) => s.loading),
  }
}

export function useOutstandingFees(enabled: boolean) {
  return useQuery({ queryKey: dashboardKeys.outstanding, queryFn: dashboardApi.outstanding, enabled, staleTime: 5 * 60_000 })
}

export function useMissingAttendance(enabled: boolean) {
  return useQuery({ queryKey: dashboardKeys.missingAttendance, queryFn: dashboardApi.missingAttendance, enabled })
}
