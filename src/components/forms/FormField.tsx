import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FieldControlProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

interface FormFieldProps {
  label: ReactNode
  error?: string
  description?: ReactNode
  required?: boolean
  className?: string
  /**
   * The control. A single element gets `id` and aria wiring injected; for
   * composite controls (Radix Select) use the render form and spread the props
   * onto the focusable trigger.
   */
  children: ReactElement | ((props: FieldControlProps) => ReactNode)
}

export function FormField({ label, error, description, required, className, children }: FormFieldProps) {
  const id = useId()
  const descId = description ? `${id}-desc` : undefined
  const errId = error ? `${id}-err` : undefined
  const controlProps: FieldControlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [descId, errId].filter(Boolean).join(' ') || undefined,
  }

  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </Label>
      {typeof children === 'function'
        ? children(controlProps)
        : isValidElement(children)
          ? cloneElement(children as ReactElement<FieldControlProps>, controlProps)
          : children}
      {description && !error && (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
