import { Circle } from 'lucide-react'
import { humanize } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { STATUS_STYLES, TONE_CLASSES, type StatusTone } from '@/shared/constants/statuses'

interface StatusBadgeProps {
  status: string
  /** The backend's label for this value; falls back to a humanized value. */
  label?: string
  tone?: StatusTone
  className?: string
}

export function StatusBadge({ status, label, tone, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status]
  const Icon = style?.icon ?? Circle
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone ?? style?.tone ?? 'neutral'],
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label ?? humanize(status)}
    </span>
  )
}
