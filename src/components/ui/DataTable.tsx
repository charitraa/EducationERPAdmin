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
    <div style={{ overflowX: 'auto' }}>
      <table className="m-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={col.className}>
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
              className={cn(onRowClick && 'row-clickable')}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((col, i) => (
                <td key={i} className={col.className}>
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
