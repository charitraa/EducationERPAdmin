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

const sum = (sources: InboxSource[]) => ({
  sources,
  total: sources.reduce((n, s) => n + (s.count ?? 0), 0),
  loading: sources.some((s) => s.loading),
})

const fromCount = (key: string, label: string, to: string, q: { data?: number; isLoading: boolean; isError: boolean }): InboxSource => ({
  key,
  label,
  to,
  count: q.data,
  loading: q.isLoading,
  error: q.isError,
})

/**
 * "Waiting for me": everything that needs this person's action or decision,
 * in one place. Sources the user can't reach are left out.
 */
export function useWaitingForMe() {
  const { hasPermission } = usePermissions()
  const canMark = hasPermission(PERMS.exams.mark)
  const canRollCall = hasPermission(PERMS.attendance.mark)
  const canApproveLeave = hasPermission(PERMS.hr.approveLeave)
  const canVerify = hasPermission(PERMS.exams.manage)
  const canModerate = hasPermission(PERMS.careers.board)

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
  const toVerify = useCount('mark-sheets', '/mark-sheets/', { status: 'submitted' }, canVerify)
  const postings = useCount('careers-postings', '/careers/postings/', { status: 'pending' }, canModerate)
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
    ...(canVerify ? [fromCount('verify', tr('Mark sheets to verify'), '/examinations/mark-sheets?status=submitted', toVerify)] : []),
    ...(canModerate ? [fromCount('postings', tr('Job board posts to review'), '/careers/board?status=pending', postings)] : []),
    { key: 'notifications', label: tr('Unread notifications'), count: notifications.data, loading: notifications.isLoading, error: notifications.isError, to: '/notifications' },
  ]

  return sum(sources)
}

/**
 * "Needs attention": the backlog of each office the user runs (overdue loans,
 * low stock, open hostel complaints, unissued invoices, crew licences running out). Each line
 * shows only to someone who may act on it; the backend scopes counts to
 * their campuses.
 */
export function useNeedsAttention() {
  const { hasPermission, hasAnyPermission } = usePermissions()
  const library = hasPermission(PERMS.library.circulate)
  const inventory = hasPermission(PERMS.inventory.view)
  const hostel = hasPermission(PERMS.hostel.view)
  const transport = hasPermission(PERMS.transport.view)
  const finance = hasPermission(PERMS.finance.manage)
  const careers = hasPermission(PERMS.careers.manage)
  const payroll = hasAnyPermission([PERMS.payroll.manage, PERMS.payroll.approve])
  const payout = hasPermission(PERMS.payroll.manage)

  const overdue = useCount('library-issues', '/library/issues/', { overdue: true }, library)
  const ready = useCount('library-reservations', '/library/reservations/', { status: 'ready' }, library)
  const low = useCount('inventory-stock', '/inventory/stock-levels/', { low: true }, inventory)
  const repairs = useCount('inventory-maintenance', '/inventory/maintenance/', { status: 'scheduled' }, inventory)
  const complaints = useCount('hostel-complaints', '/hostel/complaints/', { status: 'open' }, hostel)
  const drafts = useCount('invoices', '/invoices/', { status: 'draft' }, finance)
  const draftRuns = useCount('payroll-runs', '/payroll/runs/', { status: 'draft' }, payroll)
  const unpaidRuns = useCount('payroll-runs', '/payroll/runs/', { status: 'approved' }, payout)
  const interviews = useCount('careers-interviews', '/careers/interviews/', { status: 'scheduled' }, careers)
  const licences = useCount('transport-drivers', '/transport/drivers/', { is_active: true, license_expiring_within: 30 }, transport)

  return sum([
    ...(library
      ? [
          fromCount('overdue', tr('Overdue library loans'), '/library/loans?overdue=true', overdue),
          fromCount('ready', tr('Reserved books waiting to be collected'), '/library/reservations?status=ready', ready),
        ]
      : []),
    ...(inventory
      ? [
          fromCount('low', tr('Stock at or below reorder level'), '/inventory?low=true', low),
          fromCount('repairs', tr('Maintenance not yet started'), '/inventory/maintenance?status=scheduled', repairs),
        ]
      : []),
    ...(hostel ? [fromCount('complaints', tr('Open hostel complaints'), '/hostel/complaints?status=open', complaints)] : []),
    ...(finance ? [fromCount('drafts', tr('Draft invoices not yet issued'), '/finance/invoices?status=draft', drafts)] : []),
    ...(payroll ? [fromCount('draft-runs', tr('Payroll runs still in draft'), '/payroll?status=draft', draftRuns)] : []),
    ...(payout ? [fromCount('unpaid-runs', tr('Approved payroll runs not yet paid'), '/payroll?status=approved', unpaidRuns)] : []),
    ...(careers ? [fromCount('interviews', tr('Interviews scheduled'), '/careers/interviews?status=scheduled', interviews)] : []),
    ...(transport ? [fromCount('licences', tr('Driver licences expiring within 30 days'), '/transport/crew?is_active=true&license_expiring_within=30', licences)] : []),
  ])
}

export function useOutstandingFees(enabled: boolean) {
  return useQuery({ queryKey: dashboardKeys.outstanding, queryFn: dashboardApi.outstanding, enabled, staleTime: 5 * 60_000 })
}

export function useMissingAttendance(enabled: boolean) {
  return useQuery({ queryKey: dashboardKeys.missingAttendance, queryFn: dashboardApi.missingAttendance, enabled })
}
