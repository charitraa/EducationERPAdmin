import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { CardSkeleton } from './LoadingState'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  hint?: ReactNode
  to?: string
  loading?: boolean
  error?: boolean
  className?: string
}

export function StatCard({ label, value, icon: Icon, hint, to, loading, error, className }: StatCardProps) {
  if (loading) return <CardSkeleton className={className} />
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{error ? '—' : value}</p>
      {(hint || error) && (
        <p className="mt-0.5 text-xs text-muted-foreground">{error ? "Couldn't load" : hint}</p>
      )}
    </>
  )
  const classes = cn('block rounded-lg border bg-card p-4', className)
  return to ? (
    <Link to={to} className={cn(classes, 'transition-colors hover:border-primary/40 hover:bg-accent/40')}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}
