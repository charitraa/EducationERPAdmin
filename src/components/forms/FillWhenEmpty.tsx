import { useEffect } from 'react'

/**
 * Fills an empty form field once its default arrives. Dialog forms take their
 * defaults when they open, which can be before a picker's options have loaded.
 */
export function FillWhenEmpty({ value, fallback, fill }: { value: string; fallback: string | null | undefined; fill: (v: string) => void }) {
  useEffect(() => {
    if (!value && fallback) fill(fallback)
    // Only when the fallback arrives; clearing the field by hand is respected afterwards.
  }, [fallback])
  return null
}
