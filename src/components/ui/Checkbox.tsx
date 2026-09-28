import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'size-4 rounded border-border text-accent',
        'focus:outline-none focus:ring-2 focus:ring-accent/30',
        className,
      )}
      {...props}
    />
  ),
)
Checkbox.displayName = 'Checkbox'
