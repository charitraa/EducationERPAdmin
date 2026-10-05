import { Check, X } from 'lucide-react'
import { humanize } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

interface StatusTimelineProps {
  /** The happy path, in order, e.g. ['pending', 'approved', 'enrolled']. */
  steps: readonly string[]
  current: string
  /** Value → label (usually from `enumLabels`). */
  labels?: Record<string, string>
  /** End states off the happy path, e.g. ['rejected', 'withdrawn']. */
  terminal?: readonly string[]
  className?: string
}

/**
 * Where a record is in its workflow: done steps, the current one, what's next.
 * A terminal off-path state (rejected, withdrawn) replaces the remaining steps.
 */
export function StatusTimeline({ steps, current, labels = {}, terminal = [], className }: StatusTimelineProps) {
  const label = (s: string) => (labels[s] ? tr(labels[s]) : humanize(s))
  const offPath = terminal.includes(current)
  const currentIndex = offPath ? -1 : steps.indexOf(current)
  const shown = offPath ? [...steps.slice(0, 1), current] : steps

  return (
    <ol className={cn('flex flex-wrap items-center gap-y-2 text-sm', className)} aria-label={tr('Progress')}>
      {shown.map((step, i) => {
        const isCurrent = step === current
        // Reaching the last step finishes the workflow: show it ticked, not in progress.
        const done = offPath ? i === 0 : i < currentIndex || (isCurrent && i === steps.length - 1)
        const failed = offPath && isCurrent
        return (
          <li key={step} className="flex items-center" aria-current={isCurrent ? 'step' : undefined}>
            {i > 0 && <span className={cn('mx-2 h-px w-6 sm:w-10', done || isCurrent ? 'bg-primary' : 'bg-border')} aria-hidden />}
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                done && 'border-primary bg-primary text-primary-foreground',
                isCurrent && !failed && !done && 'border-primary bg-accent text-accent-foreground ring-2 ring-primary/20',
                failed && 'border-danger bg-danger text-white',
                !done && !isCurrent && 'border-border text-muted-foreground',
              )}
              aria-hidden
            >
              {done ? <Check className="h-3.5 w-3.5" /> : failed ? <X className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('ml-1.5', isCurrent ? 'font-medium' : 'text-muted-foreground')}>
              {label(step)}
              <span className="sr-only">{isCurrent ? (done ? ' ' + tr('(done, current)') : ' ' + tr('(current)')) : done ? ' ' + tr('(done)') : ' ' + tr('(next)')}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
