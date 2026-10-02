import { LayoutDashboard, Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { allNavItems } from '@/app/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Daily-use screens first: what a teacher or office worker opens on a phone. */
const PREFERRED = ['/attendance', '/students', '/academics', '/notices', '/messages']

export function MobileBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { can } = usePermissions()
  const items = PREFERRED.map((p) => allNavItems.find((i) => i.path === p))
    .filter((i): i is NonNullable<typeof i> => Boolean(i) && can(i!.permission) && i!.status !== 'planned')
    .slice(0, 3)
  const tab = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]'

  return (
    <nav aria-label="Quick" className="pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t bg-background md:hidden">
      <NavLink to="/" end className={({ isActive }) => cn(tab, isActive ? 'text-primary' : 'text-muted-foreground')}>
        <LayoutDashboard className="h-5 w-5" aria-hidden />
        {t('nav.dashboard')}
      </NavLink>
      {items.map((item) => (
        <NavLink key={item.path} to={item.path} className={({ isActive }) => cn(tab, isActive ? 'text-primary' : 'text-muted-foreground')}>
          <item.icon className="h-5 w-5" aria-hidden />
          {t(item.label)}
        </NavLink>
      ))}
      <button type="button" onClick={onOpenMenu} className={cn(tab, 'text-muted-foreground')}>
        <Menu className="h-5 w-5" aria-hidden />
        Menu
      </button>
    </nav>
  )
}
