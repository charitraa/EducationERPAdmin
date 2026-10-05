import { Inbox, SearchX, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  /** Usually "Add the first …", gated by permission by the caller. */
  action?: ReactNode
  /** When filters caused the empty result: show "No … match" with a clear button instead. */
  filtered?: boolean
  onClearFilters?: () => void
  className?: string
}

export function EmptyState({ title, description, icon, action, filtered, onClearFilters, className }: EmptyStateProps) {
  const Icon = filtered ? SearchX : (icon ?? Inbox)
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-3 rounded-full bg-muted p-3">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <p className="font-medium">{filtered ? tr('Nothing matches your filters') : title}</p>
      {(filtered || description) && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {filtered ? tr('Try a different search, or clear the filters.') : description}
        </p>
      )}
      <div className="mt-4">
        {filtered && onClearFilters ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            {tr('Clear filters')}
          </Button>
        ) : (
          action
        )}
      </div>
    </div>
  )
}
