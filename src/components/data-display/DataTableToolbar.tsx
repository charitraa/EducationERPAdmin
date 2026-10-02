import type { ReactNode } from 'react'
import { FilterPanel, type FilterDef } from '@/components/common/FilterPanel'
import { SearchInput } from '@/components/common/SearchInput'
import type { ListState } from '@/hooks/usePagination'

interface DataTableToolbarProps {
  list: ListState
  /** False when the endpoint has no `?search=` (e.g. curriculum, terms). */
  searchable?: boolean
  searchPlaceholder?: string
  filters?: FilterDef[]
  /** Extra controls on the right (e.g. a view switch). */
  children?: ReactNode
}

export function DataTableToolbar({ list, searchable = true, searchPlaceholder, filters = [], children }: DataTableToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:flex-wrap sm:items-end">
      {searchable && <SearchInput value={list.search} onChange={list.setSearch} placeholder={searchPlaceholder} />}
      <FilterPanel
        filters={filters}
        values={list.filters}
        onChange={(name, value) => list.setFilter(name, value)}
        onClear={list.clearFilters}
        activeCount={list.activeFilterCount}
      />
      {children && <div className="flex items-center gap-2 sm:ml-auto">{children}</div>}
    </div>
  )
}
