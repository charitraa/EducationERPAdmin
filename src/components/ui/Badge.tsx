import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

/** CoolAdmin's app.css re-skins Bootstrap's `.badge.bg-*` classes; `bg-neutral`
 * is our own addition (index.css) for the one tone it doesn't ship. */
const toneClass: Record<Tone, string> = {
  neutral: 'bg-neutral',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  accent: 'bg-primary',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('badge', toneClass[tone], 'text-capitalize', className)} {...props} />
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
