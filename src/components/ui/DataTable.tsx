import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  keyFor,
  onRowClick,
  emptyTitle = 'No results',
  emptyDescription,
}: {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  keyFor: (row: T) => string | number
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (loading) return <Spinner />
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-xs font-medium uppercase tracking-wide text-text-faint">
            {columns.map((col, i) => (
              <th key={i} className={cn('px-5 py-3', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={keyFor(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-border-soft last:border-0',
                onRowClick && 'cursor-pointer hover:bg-surface-2',
              )}
            >
              {columns.map((col, i) => (
                <td key={i} className={cn('px-5 py-3 text-text', col.className)}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
