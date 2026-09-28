import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** CoolAdmin's `.m-card` bakes in its own 20px padding — children sit
 * directly inside it, not in a separately-padded wrapper. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('m-card', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <header className={cn('m-card__header', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('m-card__title', className)} {...props} />
}

/** For a card whose content wasn't laid out for `.m-card`'s built-in inset
 * padding (e.g. a list page's toolbar+table+pagination stack) — cancels the
 * card's own padding so the caller controls its own spacing edge-to-edge. */
export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />
}
