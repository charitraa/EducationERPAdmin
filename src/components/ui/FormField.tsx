import type { LabelHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps extends LabelHTMLAttributes<HTMLLabelElement> {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}

export function FormField({ label, required, error, hint, children, className, ...props }: FormFieldProps) {
  return (
    <label className={cn('block', className)} {...props}>
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-text">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-text-faint">{hint}</span>
      ) : null}
    </label>
  )
}
