import { formatDate, parseIsoDate, todayIso } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

/** Days until a date; negative once it has passed. */
export const daysUntil = (iso: string | null | undefined) => {
  const d = parseIsoDate(iso ?? null)
  const today = parseIsoDate(todayIso())!
  return d ? Math.round((d.getTime() - today.getTime()) / 86400000) : null
}

/** An expiry date: expired in red, within 30 days in amber. */
export function Expiry({ on }: { on: string | null | undefined }) {
  const days = daysUntil(on)
  if (days == null) return <span className="text-muted-foreground">—</span>
  return (
    <span className={cn('tabular-nums', days < 0 ? 'font-medium text-danger' : days <= 30 ? 'font-medium text-warning' : undefined)}>
      {formatDate(on)}
      {days < 0 ? ' · ' + tr('expired') : days <= 30 ? ' · ' + tr('{days} days', { days }) : ''}
    </span>
  )
}
