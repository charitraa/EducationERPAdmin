import { z } from 'zod'
import { formatMoney, toPaisa } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

/** A money field: digits with at most two decimals, kept as a string. */
export const moneyInput = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, tr('An amount like 1500 or 1500.50.'))
  .refine((v) => (toPaisa(v) ?? 0n) > 0n, tr('Must be more than zero.'))

/** An amount, right-aligned and tabular; negatives (scholarships, discounts) in the success colour. */
export function Money({ value, className, tone }: { value: string | number | null | undefined; className?: string; tone?: 'auto' | 'none' }) {
  const negative = (toPaisa(value ?? null) ?? 0n) < 0n
  return <span className={cn('whitespace-nowrap tabular-nums', tone !== 'none' && negative && 'text-success', className)}>{formatMoney(value)}</span>
}

/** "1500.00" > "0"? Without floats. */
export const isPositive = (v: string | number | null | undefined) => (toPaisa(v ?? null) ?? 0n) > 0n
