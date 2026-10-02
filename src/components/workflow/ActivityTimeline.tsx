import type { ReactNode } from 'react'
import { formatDateTime } from '@/lib/dates'

export interface ActivityItem {
  id: string | number
  title: ReactNode
  actor?: string | null
  at: string
  body?: ReactNode
}

/** What happened, newest first: who did what, when, and any note. */
export function ActivityTimeline({ items, empty = 'No activity yet.' }: { items: ActivityItem[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" aria-hidden />
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.actor ? `${item.actor} · ` : ''}
            <time dateTime={item.at}>{formatDateTime(item.at)}</time>
          </p>
          {item.body && <div className="mt-1 text-sm text-muted-foreground">{item.body}</div>}
        </li>
      ))}
    </ol>
  )
}
