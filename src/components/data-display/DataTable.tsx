import type { UseQueryResult } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { FilterDef } from '@/components/common/FilterPanel'
import { Checkbox } from '@/components/ui/checkbox'
import type { ListState } from '@/hooks/usePagination'
import { cn } from '@/lib/utils'
import type { Id, Paginated } from '@/shared/types/api'
import { DataTableToolbar } from './DataTableToolbar'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { TableSkeleton } from './LoadingState'
import { Pagination } from './Pagination'

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  /** Backend field for `?ordering=`; makes the header sortable. */
  sortField?: string
  className?: string
  /** Drop the column entirely (e.g. Branch when there is only one branch). */
  hidden?: boolean
  /** How the column appears on a mobile card. The first column is the title by default. */
  mobile?: 'title' | 'field' | 'hidden'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  query: Pick<UseQueryResult<Paginated<T>>, 'data' | 'isPending' | 'isError' | 'error' | 'refetch' | 'isPlaceholderData'>
  list: ListState
  getRowId: (row: T) => Id
  searchable?: boolean
  searchPlaceholder?: string
  filters?: FilterDef[]
  toolbar?: ReactNode
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => ReactNode
  /** Turns on row selection; rendered above the table while rows are selected. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode
  empty: { title: string; description?: ReactNode; action?: ReactNode }
  ariaLabel: string
}

function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  if (dir === 'asc') return <ArrowUp className="h-3 w-3" aria-hidden />
  if (dir === 'desc') return <ArrowDown className="h-3 w-3" aria-hidden />
  return <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden />
}

/** Arrow keys move between rows; Enter opens one. */
function onRowKeyDown(e: KeyboardEvent<HTMLElement>, open?: () => void) {
  if (e.key === 'Enter' && open) {
    e.preventDefault()
    open()
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const sibling = (e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling) as HTMLElement | null
    sibling?.focus()
  }
}

export function DataTable<T>({
  columns: allColumns,
  query,
  list,
  getRowId,
  searchable,
  searchPlaceholder,
  filters,
  toolbar,
  onRowClick,
  rowActions,
  bulkActions,
  empty,
  ariaLabel,
}: DataTableProps<T>) {
  const columns = allColumns.filter((c) => !c.hidden)
  const [selected, setSelected] = useState<Map<Id, T>>(new Map())
  const rows = query.data?.results ?? []
  const selectable = Boolean(bulkActions)
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(getRowId(r)))

  const toggleRow = (row: T) =>
    setSelected((prev) => {
      const next = new Map(prev)
      const id = getRowId(row)
      if (next.has(id)) next.delete(id)
      else next.set(id, row)
      return next
    })
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev)
      for (const r of rows) {
        if (allOnPageSelected) next.delete(getRowId(r))
        else next.set(getRowId(r), r)
      }
      return next
    })
  const clearSelection = () => setSelected(new Map())

  const sortDir = (field?: string) => {
    if (!field) return null
    if (list.ordering === field) return 'asc'
    if (list.ordering === `-${field}`) return 'desc'
    return null
  }
  const cycleSort = (field: string) => {
    const dir = sortDir(field)
    list.setOrdering(dir === null ? field : dir === 'asc' ? `-${field}` : '')
  }

  let body: ReactNode
  if (query.isPending) {
    body = <TableSkeleton columns={Math.min(columns.length, 6)} />
  } else if (query.isError) {
    body = <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  } else if (rows.length === 0) {
    body = <EmptyState {...empty} filtered={list.isFiltered} onClearFilters={list.clearFilters} />
  } else {
    const titleCol = columns.find((c) => c.mobile === 'title') ?? columns[0]!
    body = (
      <div className={cn(query.isPlaceholderData && 'opacity-60 transition-opacity')}>
        {/* Desktop and tablet: dense table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm" aria-label={ariaLabel}>
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <tr>
                {selectable && (
                  <th className="w-10 px-3 py-2">
                    <Checkbox checked={allOnPageSelected} onCheckedChange={togglePage} aria-label="Select all rows on this page" />
                  </th>
                )}
                {columns.map((col) => {
                  const dir = sortDir(col.sortField)
                  return (
                    <th
                      key={col.id}
                      scope="col"
                      className={cn('whitespace-nowrap px-3 py-2 font-medium', col.className)}
                      aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                    >
                      {col.sortField ? (
                        <button
                          type="button"
                          onClick={() => cycleSort(col.sortField!)}
                          className="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground"
                        >
                          {col.header}
                          <SortIcon dir={dir} />
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  )
                })}
                {rowActions && (
                  <th className="w-12 px-3 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => {
                const id = getRowId(row)
                const open = onRowClick ? () => onRowClick(row) : undefined
                return (
                  <tr
                    key={id}
                    tabIndex={open ? 0 : undefined}
                    onClick={open}
                    onKeyDown={(e) => e.target === e.currentTarget && onRowKeyDown(e, open)}
                    className={cn(
                      'outline-none focus-visible:bg-accent/60',
                      open && 'cursor-pointer hover:bg-muted/40',
                      selected.has(id) && 'bg-accent/50',
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.has(id)} onCheckedChange={() => toggleRow(row)} aria-label="Select row" />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.id} className={cn('px-3 py-2 align-middle', col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-2 py-1 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Phone: one card per row */}
        <ul className="divide-y md:hidden" aria-label={ariaLabel}>
          {rows.map((row) => {
            const id = getRowId(row)
            const open = onRowClick ? () => onRowClick(row) : undefined
            return (
              <li
                key={id}
                tabIndex={open ? 0 : undefined}
                onClick={open}
                onKeyDown={(e) => e.target === e.currentTarget && onRowKeyDown(e, open)}
                className={cn('flex gap-3 px-3 py-3 outline-none focus-visible:bg-accent/60', open && 'active:bg-muted/60')}
              >
                {selectable && (
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <Checkbox checked={selected.has(id)} onCheckedChange={() => toggleRow(row)} aria-label="Select row" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{titleCol.cell(row)}</div>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    {columns
                      .filter((c) => c !== titleCol && c.mobile !== 'hidden')
                      .map((col) => (
                        <div key={col.id} className="contents">
                          <dt className="text-muted-foreground">{col.header}</dt>
                          <dd className="min-w-0">{col.cell(row)}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
                {rowActions && <div onClick={(e) => e.stopPropagation()}>{rowActions(row)}</div>}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <DataTableToolbar list={list} searchable={searchable} searchPlaceholder={searchPlaceholder} filters={filters}>
        {toolbar}
      </DataTableToolbar>
      {selectable && selected.size > 0 && (
        <div className="flex items-center gap-3 border-b bg-accent/50 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          {bulkActions!([...selected.values()], clearSelection)}
          <button type="button" onClick={clearSelection} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            Clear selection
          </button>
        </div>
      )}
      {body}
      {query.data && (
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          count={query.data.count}
          totalPages={query.data.total_pages}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
        />
      )}
    </div>
  )
}
