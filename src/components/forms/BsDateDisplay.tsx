import { toBsDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

/** `2026-10-02` with `2083-06-16 BS` underneath (or inline). BS is for reading only. */
export function BsDateDisplay({ value, inline, className }: { value: string | null | undefined; inline?: boolean; className?: string }) {
  if (!value) return <span className={className}>—</span>
  const bs = toBsDate(value)
  return (
    <span className={cn(inline ? 'inline-flex items-baseline gap-1.5' : 'inline-flex flex-col', className)}>
      <span className="tabular-nums">{value.slice(0, 10)}</span>
      {bs && <span className="text-xs tabular-nums text-muted-foreground">{tr('{bs} BS', { bs })}</span>}
    </span>
  )
}
