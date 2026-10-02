import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The banner above a form for the server's `message`. */
export function FormError({ message, className }: { message?: string | null; className?: string }) {
  if (!message) return null
  return (
    <div role="alert" className={cn('flex gap-2 rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger', className)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  )
}
