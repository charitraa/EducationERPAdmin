import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-text-muted border-border',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  info: 'bg-info-soft text-info border-transparent',
  accent: 'bg-accent-soft text-accent border-transparent',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}

const STATUS_TONE: Record<string, Tone> = {
  active: 'success',
  approved: 'success',
  enrolled: 'success',
  graduated: 'success',
  pending: 'warning',
  on_leave: 'warning',
  suspended: 'warning',
  withdrawn: 'danger',
  rejected: 'danger',
  left: 'danger',
  inactive: 'neutral',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status.replace(/_/g, ' ')}</Badge>
}
