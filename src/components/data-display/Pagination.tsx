import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAGE_SIZE_OPTIONS } from '@/shared/api/pagination'
import { tr } from '@/lib/i18n'

interface PaginationProps {
  page: number
  pageSize: number
  count: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

/** Pages to show: first, last, and a window around the current one. */
function pageWindow(page: number, total: number): Array<number | 'gap'> {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const out: Array<number | 'gap'> = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('gap')
    out.push(p)
  })
  return out
}

export function Pagination({ page, pageSize, count, totalPages, onPageChange, onPageSizeChange }: PaginationProps) {
  if (count === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, count)

  return (
    <nav aria-label={tr('Pagination')} className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2.5 text-sm">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="tabular-nums">
          {tr('{localeString}–{localeString2} of {localeString3}', { localeString: from.toLocaleString(), localeString2: to.toLocaleString(), localeString3: count.toLocaleString() })}
        </span>
        <div className="hidden items-center gap-1.5 sm:flex">
          <span id="page-size-label">{tr('Rows')}</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[72px]" aria-labelledby="page-size-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label={tr('Previous page')}>
          <ChevronLeft />
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, totalPages).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'ghost'}
                size="sm"
                className="h-8 min-w-8 px-2 tabular-nums"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </Button>
            ),
          )}
        </div>
        <span className="px-2 tabular-nums text-muted-foreground sm:hidden">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label={tr('Next page')}>
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
