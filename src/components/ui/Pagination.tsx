import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export function Pagination({
  page,
  totalPages,
  count,
  pageSize,
  onPageChange,
}: {
  page: number
  totalPages: number
  count: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, count)

  return (
    <div
      className="d-flex align-items-center justify-content-between"
      style={{ gap: 16, borderTop: '1px solid var(--m-divider)', marginTop: 12, paddingTop: 12 }}
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--m-text-muted)' }}>
        Showing <strong style={{ color: 'var(--m-text)' }}>{start}–{end}</strong> of{' '}
        <strong style={{ color: 'var(--m-text)' }}>{count}</strong>
      </p>
      <div className="d-flex align-items-center gap-1">
        <Button variant="ghost" size="sm" className="m-btn--icon" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={16} />
        </Button>
        <span style={{ padding: '0 8px', fontSize: 13, color: 'var(--m-text-muted)' }}>
          Page {page} of {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="m-btn--icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
