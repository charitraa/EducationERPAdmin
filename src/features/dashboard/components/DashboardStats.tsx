import { CalendarCheck, ClipboardCheck, ClipboardList, FileStack, GraduationCap, LifeBuoy, UserRound, Wallet } from 'lucide-react'
import type { ComponentProps } from 'react'
import { StatCard } from '@/components/data-display/StatCard'
import { usePermissions } from '@/hooks/usePermissions'
import { formatMoney } from '@/lib/currency'
import { useCount } from '@/shared/api/count'
import { PERMS } from '@/shared/constants/permissions'
import { useMissingAttendance, useOutstandingFees } from '../hooks/useDashboard'

function CountCard({ resource, path, params, enabled, ...card }: Omit<ComponentProps<typeof StatCard>, 'value'> & { resource: string; path: string; params?: Record<string, string>; enabled: boolean }) {
  const count = useCount(resource, path, params, enabled)
  if (!enabled) return null
  return <StatCard {...card} loading={count.isPending} error={count.isError} value={count.data?.toLocaleString()} />
}

/** Every card is shown only to people allowed to see what it counts. */
export function DashboardStats() {
  const { hasPermission, hasAnyPermission } = usePermissions()
  const canFinance = hasPermission(PERMS.finance.view)
  const canAttendance = hasPermission(PERMS.attendance.view)
  const outstanding = useOutstandingFees(canFinance)
  const missing = useMissingAttendance(canAttendance)

  return (
    <div className="grid grid-cols-2 gap-3 empty:hidden lg:grid-cols-4">
      <CountCard label="Active students" icon={GraduationCap} resource="students" path="/students/" params={{ status: 'active' }} enabled={hasPermission(PERMS.students.view)} to="/students" />
      <CountCard label="Active staff" icon={UserRound} resource="staff" path="/staff/" params={{ status: 'active' }} enabled={hasPermission(PERMS.staff.view)} to="/staff" />
      {canAttendance && (
        <StatCard
          label="Today's attendance"
          icon={CalendarCheck}
          loading={missing.isPending}
          error={missing.isError}
          value={missing.data?.missing.length ?? 0}
          hint={missing.data?.missing.length ? 'roll calls not yet submitted' : 'all roll calls submitted'}
          to="/attendance"
        />
      )}
      <CountCard label="Pending admissions" icon={ClipboardList} resource="admissions" path="/admissions/" params={{ status: 'pending' }} enabled={hasPermission(PERMS.admissions.view)} to="/admissions" />
      {canFinance && (
        <StatCard
          label="Overdue fees"
          icon={Wallet}
          loading={outstanding.isPending}
          error={outstanding.isError}
          value={<span className="text-xl">{formatMoney(outstanding.data?.total_outstanding)}</span>}
          hint={outstanding.data ? `${outstanding.data.count} overdue invoice${outstanding.data.count === 1 ? '' : 's'}` : undefined}
          to="/finance"
        />
      )}
      <CountCard label="Upcoming exams" icon={ClipboardCheck} resource="exams" path="/exams/" params={{ status: 'scheduled' }} enabled={hasAnyPermission([PERMS.exams.view])} to="/examinations" />
      <CountCard label="Applications in review" icon={FileStack} resource="applications" path="/applications/" params={{ status: 'in_review' }} enabled={hasPermission(PERMS.applications.view)} to="/applications" />
      <CountCard label="Open support tickets" icon={LifeBuoy} resource="support-tickets" path="/support/tickets/" params={{ status: 'open' }} enabled={hasPermission(PERMS.support.manage)} to="/support" />
    </div>
  )
}
