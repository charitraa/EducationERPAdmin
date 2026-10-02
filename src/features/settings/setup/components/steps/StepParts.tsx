import type { ReactNode } from 'react'
import { Spinner } from '@/components/data-display/LoadingState'

/** A compact list of what already exists, so the step shows progress, not just buttons. */
export function MiniList({ title, items, loading, empty, action }: { title: string; items: ReactNode[]; loading?: boolean; empty: string; action?: ReactNode }) {
  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <h3 className="text-sm font-medium">
          {title}
          {!loading && items.length > 0 && <span className="ml-1.5 text-muted-foreground">({items.length})</span>}
        </h3>
        {action}
      </div>
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="max-h-56 divide-y overflow-y-auto text-sm">
          {items.map((item, i) => (
            <li key={i} className="px-3 py-1.5">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StepNote({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{children}</p>
}
