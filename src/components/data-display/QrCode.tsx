import QRCode from 'qrcode'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

/**
 * A QR code as an SVG, always dark on white (phone cameras need the contrast,
 * dark mode or not). `value` is usually a URL the phone's camera app opens.
 * Low error correction by default: on a screen, coarser modules that scan
 * from across a room matter more than damage tolerance. Printed labels that
 * get scuffed use `level="M"`.
 */
export function QrCode({ value, label, className, level = 'L' }: { value: string; label: string; className?: string; level?: 'L' | 'M' | 'Q' | 'H' }) {
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: level })
    let d = ''
    for (let y = 0; y < modules.size; y++)
      for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) d += `M${x + 4} ${y + 4}h1v1h-1z`
    // 4 modules of quiet zone on each side, as the spec asks.
    return { size: modules.size + 8, path: d }
  }, [value, level])
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges" className={cn('block rounded-md bg-white', className)}>
      <path d={path} fill="#000" />
    </svg>
  )
}
