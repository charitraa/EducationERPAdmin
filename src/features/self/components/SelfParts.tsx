import type { UseQueryResult } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { isStatus, toApiError } from '@/shared/api/errors'

/**
 * A `me` query's loading and error states. A 404 from these endpoints means the
 * account isn't linked to that kind of record ("no library membership"), which
 * is shown as a plain note with the backend's own words.
 */
export function Loaded<T>({ query, children, rows = 3 }: { query: Pick<UseQueryResult<T>, 'data' | 'isPending' | 'isError' | 'error' | 'refetch'>; children: (data: T) => ReactNode; rows?: number }) {
  if (query.isPending) return <TableSkeleton rows={rows} columns={4} />
  if (query.isError && isStatus(query.error, 404)) return <Note>{toApiError(query.error).message}</Note>
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <>{children(query.data as T)}</>
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{children}</p>
}

export interface MiniColumn<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

/** A plain table for the unpaginated `me` lists; a stacked card per row on phones. */
export function MiniTable<T>({ rows, columns, rowKey, empty, label }: { rows: T[]; columns: MiniColumn<T>[]; rowKey: (row: T) => string | number; empty: { title: string; description?: ReactNode; icon?: LucideIcon }; label: string }) {
  if (rows.length === 0) return <EmptyState title={empty.title} description={empty.description} icon={empty.icon} />
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
        <table className="w-full text-sm" aria-label={label}>
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.header} scope="col" className={`px-3 py-2 font-medium ${c.className ?? ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={rowKey(r)}>
                {columns.map((c) => (
                  <td key={c.header} className={`px-3 py-2 align-top ${c.className ?? ''}`}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-2 md:hidden" aria-label={label}>
        {rows.map((r) => (
          <li key={rowKey(r)} className="rounded-lg border bg-card p-3 text-sm">
            <div className="font-medium">{columns[0].cell(r)}</div>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              {columns.slice(1).map((c) => (
                <div key={c.header} className="contents">
                  <dt className="text-xs text-muted-foreground">{c.header}</dt>
                  <dd className="text-xs">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}

/** A titled block on a self-service page. */
export function Block({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A label and a figure, for the summary rows at the top of a page. */
export function Figure({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
