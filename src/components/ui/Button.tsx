import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const sizeClass: Record<Size, string | undefined> = {
  sm: 'm-btn--sm',
  md: undefined,
  lg: 'm-btn--lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn('m-btn', `m-btn--${variant}`, sizeClass[size], className)}
        {...props}
      >
        {loading && <Loader2 className="m-spin" size={14} />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
