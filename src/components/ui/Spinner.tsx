import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className, label = 'Loading…' }: { className?: string; label?: string }) {
  return (
    <div
      className={cn('d-flex align-items-center justify-content-center gap-2', className)}
      style={{ padding: '48px 0', color: 'var(--m-text-muted)' }}
    >
      <Loader2 className="m-spin" size={18} />
      <span style={{ fontSize: 13.5 }}>{label}</span>
    </div>
  )
}
