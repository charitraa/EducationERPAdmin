import { CalendarDays } from 'lucide-react'
import { PermissionGate } from '@/components/common/PermissionGate'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { todayIso, toBsDate } from '@/lib/dates'
import { t, useLocale } from '@/lib/i18n'
import { PERMS } from '@/shared/constants/permissions'
import { useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { MySummary } from '@/features/self/components/MySummary'
import { SetupChecklist } from '@/features/settings/setup/components/SetupChecklist'
import { DashboardStats } from '../components/DashboardStats'
import { WaitingForMe } from '../components/WaitingForMe'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? t('dashboard.goodMorning') : h < 17 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening')
}

export default function DashboardPage() {
  useLocale()
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const year = useCurrentAcademicYear(hasPermission(PERMS.academics.view))
  const today = todayIso()

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {greeting()}, {user?.first_name || user?.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user?.organization?.name}
            {year.data && (
              <>
                {' · '}Academic year <span className="font-medium text-foreground">{year.data.name}</span>
              </>
            )}
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {today} <span aria-hidden>·</span> {toBsDate(today)} BS
        </p>
      </header>

      <PermissionGate permission={PERMS.organizations.update}>
        <SetupChecklist />
      </PermissionGate>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          <DashboardStats />
          <MySummary />
        </div>
        <WaitingForMe />
      </div>
    </div>
  )
}
