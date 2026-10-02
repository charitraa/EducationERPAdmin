import { NavLink } from 'react-router-dom'
import type { NavSection } from '@/app/navigation'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function SidebarSection({ section, onNavigate }: { section: NavSection; onNavigate?: () => void }) {
  return (
    <div className="mb-4">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">{t(section.label)}</p>
      <ul className="space-y-px">
        {section.items.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors',
                  'focus-visible:ring-sidebar-foreground/40 focus-visible:ring-offset-sidebar',
                  isActive
                    ? 'bg-sidebar-accent font-medium text-white shadow-[inset_2px_0_0_0_hsl(var(--primary-foreground))]'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  item.status === 'planned' && 'text-sidebar-foreground/50',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span className="flex-1 truncate">{t(item.label)}</span>
              {item.status === 'planned' && (
                <span className="rounded border border-sidebar-border px-1 text-[9px] uppercase tracking-wide text-sidebar-muted">
                  {t('nav.soon')}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
