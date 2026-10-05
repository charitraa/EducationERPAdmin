import { AlertTriangle, Lock, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { toApiError } from '@/shared/api/errors'
import { tr } from '@/lib/i18n'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  className?: string
}

/** Inline error for a failed load. No retry for 403/404: the answer won't change. */
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const e = toApiError(error)
  const Icon = e.status === 403 ? Lock : e.status === 404 ? SearchX : AlertTriangle
  const retryable = e.status === undefined || e.status >= 500 || e.status === 429
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-3 rounded-full bg-danger-soft p-3">
        <Icon className="h-6 w-6 text-danger" aria-hidden />
      </div>
      <p className="font-medium">{errorMessage(e)}</p>
      {retryable && onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          {tr('Try again')}
        </Button>
      )}
    </div>
  )
}
