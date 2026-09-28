import { type TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text',
        'placeholder:text-text-faint',
        'focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent',
        'disabled:bg-surface-2 disabled:text-text-faint disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
