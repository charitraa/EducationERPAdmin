import { Link, useLocation } from 'react-router-dom'
import { navItemFor, type NavSection } from '@/app/navigation'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function SidebarSection({ section, onNavigate }: { section: NavSection; onNavigate?: () => void }) {
  // Only the most specific item is current: /finance/payments is Payments, not Fees too.
  const current = navItemFor(useLocation().pathname)?.path
  return (
    <div className="mb-4">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">{t(section.label)}</p>
      <ul className="space-y-px">
        {section.items.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              onClick={onNavigate}
              aria-current={current === item.path ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors',
                'focus-visible:ring-sidebar-foreground/40 focus-visible:ring-offset-sidebar',
                current === item.path
                  ? 'bg-sidebar-accent font-medium text-white shadow-[inset_2px_0_0_0_hsl(var(--primary-foreground))]'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                item.status === 'planned' && 'text-sidebar-foreground/50',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span className="flex-1 truncate">{t(item.label)}</span>
              {item.status === 'planned' && (
                <span className="rounded border border-sidebar-border px-1 text-[9px] uppercase tracking-wide text-sidebar-muted">
                  {t('nav.soon')}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
