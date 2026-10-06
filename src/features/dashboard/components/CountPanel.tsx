import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { InboxSource } from '../hooks/useDashboard'

/**
 * A titled list of counts, each linking to the list behind it, with a total badge.
 * `hideClear` leaves out lines at zero (once loaded) and says how many there were.
 */
export function CountPanel({ title, icon: Icon, sources, total, loading, empty, hideClear }: { title: string; icon: LucideIcon; sources: InboxSource[]; total: number; loading: boolean; empty: ReactNode; hideClear?: boolean }) {
  const titleId = useId()
  const shown = hideClear ? sources.filter((s) => s.loading || s.error || s.count) : sources
  const clear = sources.length - shown.length
  return (
    <section aria-labelledby={titleId} className="rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 id={titleId} className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          {title}
        </h2>
        {loading ? (
          <Skeleton className="h-6 w-8 rounded-full" />
        ) : (
          <span
            className={cn('min-w-7 rounded-full px-2 py-0.5 text-center text-sm font-semibold tabular-nums', total > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
            aria-label={tr('{total} items waiting', { total })}
          >
            {total}
          </span>
        )}
      </header>
      {!loading && total === 0 && <p className={cn('px-4 pt-3 text-sm text-muted-foreground', shown.length === 0 && 'pb-3')}>{empty}</p>}
      <ul className="p-1.5 empty:hidden">
        {shown.map((s) => (
          <li key={s.key}>
            <Link to={s.to} className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-muted/60">
              <span className={cn('flex-1', !s.count && 'text-muted-foreground')}>{s.label}</span>
              {s.loading ? (
                <Skeleton className="h-4 w-5" />
              ) : (
                <span className={cn('tabular-nums', s.count ? 'font-semibold' : 'text-muted-foreground')}>{s.error ? '—' : (s.count ?? 0)}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {clear > 0 && total > 0 && <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">{tr('{count} other checks are all clear.', { count: clear })}</p>}
    </section>
  )
}
