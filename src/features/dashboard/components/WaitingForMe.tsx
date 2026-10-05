import { ChevronRight, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { t, tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useWaitingForMe } from '../hooks/useDashboard'

export function WaitingForMe() {
  const { sources, total, loading } = useWaitingForMe()

  return (
    <section aria-labelledby="inbox-title" className="rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 id="inbox-title" className="flex items-center gap-2 font-semibold">
          <Inbox className="h-4 w-4 text-muted-foreground" aria-hidden />
          {t('dashboard.waitingForMe')}
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
      {!loading && total === 0 && <p className="px-4 pt-3 text-sm text-muted-foreground">{t('dashboard.nothingWaiting')}</p>}
      <ul className="p-1.5">
        {sources.map((s) => (
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
    </section>
  )
}
