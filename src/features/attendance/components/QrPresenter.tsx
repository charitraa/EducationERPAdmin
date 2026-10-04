import { Loader2, Maximize2, MapPin, QrCode as QrIcon, RefreshCw, Square } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { QrCode } from '@/components/data-display/QrCode'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { errorMessage } from '@/lib/errors'
import type { QrOptions, QrToken } from '../api/attendance.api'

const TTLS = [
  { value: '20', label: 'Every 20 seconds' },
  { value: '30', label: 'Every 30 seconds' },
  { value: '60', label: 'Every minute' },
]
const RADII = [
  { value: '50', label: 'Within 50 m' },
  { value: '100', label: 'Within 100 m' },
  { value: '200', label: 'Within 200 m' },
  { value: '500', label: 'Within 500 m' },
]
/** Ask for the next code this long before the current one stops working. */
const RENEW_EARLY_S = 6

export function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error("This browser can't share its location."))
    navigator.geolocation.getCurrentPosition(resolve, (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? "Location is blocked for this site. Allow it in the browser's site settings." : "Couldn't find where you are. Try again near a window.")), {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 60_000,
    })
  })
}

/** The phone's camera app opens this; `/scan/*` sends the token with the scanner's own login. */
const scanUrl = (path: string, token: string) => `${window.location.origin}${path}?t=${encodeURIComponent(token)}`

function Showing({ issue, options, path, label, live, onStop }: { issue: (o: QrOptions, startedAt: Date) => Promise<QrToken>; options: QrOptions; path: string; label: string; live?: ReactNode; onStop: () => void }) {
  const [code, setCode] = useState<{ token: string; until: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [attempt, setAttempt] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const startedAt = useRef(new Date())
  const ttl = options.ttl ?? 30

  // Fetch a code, then the next one shortly before it expires. Timed from when
  // it arrived, so a wrong clock on this computer doesn't matter.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const next = async () => {
      try {
        const res = await issue(options, startedAt.current)
        if (cancelled) return
        setError(null)
        setCode({ token: res.token, until: Date.now() + ttl * 1000 })
        timer = setTimeout(next, (ttl - RENEW_EARLY_S) * 1000)
      } catch (err) {
        if (!cancelled) setError(errorMessage(err))
      }
    }
    void next()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [issue, options, ttl, attempt])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const left = code ? Math.max(0, Math.ceil((code.until - now) / 1000)) : 0
  const expired = code != null && left === 0

  return (
    <div ref={box} className="grid justify-items-center gap-3 bg-background p-1 [&:fullscreen]:content-center [&:fullscreen]:p-8">
      <div className="relative w-full max-w-[min(70vh,28rem)] [:fullscreen_&]:max-w-[min(80vh,48rem)]">
        {code ? (
          <QrCode value={scanUrl(path, code.token)} label={label} className={expired ? 'opacity-20' : undefined} />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/40">{!error && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />}</div>
        )}
      </div>
      <div className="h-1.5 w-full max-w-[min(70vh,28rem)] overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full bg-primary transition-[width] duration-500 ease-linear" style={{ width: code ? `${(left / ttl) * 100}%` : '0%' }} />
      </div>
      <p className="text-center text-sm text-muted-foreground" aria-live="polite">
        {error ? '' : !code ? 'Getting a code…' : expired ? 'This code has expired.' : `Scan with your phone's camera. The code changes in ${left} s.`}
      </p>
      {options.radius && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> Scans from further than {options.radius} m are refused.
        </p>
      )}
      {error && (
        <div className="grid w-full max-w-md gap-2">
          <FormError message={error} />
          <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
            <RefreshCw aria-hidden /> Try again
          </Button>
        </div>
      )}
      {live}
      <div className="flex flex-wrap justify-center gap-2 [:fullscreen_&]:hidden">
        <Button variant="outline" onClick={() => void box.current?.requestFullscreen?.()}>
          <Maximize2 aria-hidden /> Full screen
        </Button>
        <Button variant="outline" onClick={onStop}>
          <Square aria-hidden /> Stop
        </Button>
      </div>
    </div>
  )
}

/**
 * Show a rotating attendance QR code: pick how often it changes and whether
 * scans must come from nearby, then display it until stopped.
 */
export function QrPresenter({
  open,
  onOpenChange,
  title,
  description,
  path,
  issue,
  settings,
  live,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  /** `/scan/class` or `/scan/staff`. */
  path: string
  /** `startedAt`: when this code first went up, the same for every renewal. */
  issue: (options: QrOptions, startedAt: Date) => Promise<QrToken>
  /** Extra fields for the setup step (such as "late after"). */
  settings?: ReactNode
  /** Shown under the code while it's up, such as how many have scanned. */
  live?: ReactNode
}) {
  const [ttl, setTtl] = useState('30')
  const [nearby, setNearby] = useState(false)
  const [radius, setRadius] = useState('100')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState<QrOptions | null>(null)
  const switchId = useId()

  useEffect(() => {
    if (!open) {
      setRunning(null)
      setError(null)
    }
  }, [open])

  const start = async () => {
    setError(null)
    const options: QrOptions = { ttl: Number(ttl) }
    if (nearby) {
      setLocating(true)
      try {
        const { coords } = await currentPosition()
        Object.assign(options, { latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)), radius: Number(radius) })
      } catch (err) {
        setError(`${(err as Error).message} Or turn the distance check off.`)
        return
      } finally {
        setLocating(false)
      }
    }
    setRunning(options)
  }
  const stop = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    setRunning(null)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={running ? 'max-h-[100dvh] overflow-y-auto sm:max-w-2xl' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {running ? (
          <Showing issue={issue} options={running} path={path} label={title} live={live} onStop={stop} />
        ) : (
          <div className="grid gap-4">
            <FormField label="Change the code" description="A photo of the code shared in a group chat stops working when it changes.">
              {(p) => <SelectControl {...p} value={ttl} onChange={setTtl} options={TTLS} />}
            </FormField>
            {settings}
            <div className="grid gap-3 rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-0.5">
                  <Label htmlFor={switchId}>Only accept scans from nearby</Label>
                  <p className="text-xs text-muted-foreground">Uses this device's location now; phones must share theirs to scan.</p>
                </div>
                <Switch id={switchId} checked={nearby} onCheckedChange={setNearby} />
              </div>
              {nearby && <SelectControl aria-label="Distance" value={radius} onChange={setRadius} options={RADII} />}
            </div>
            <FormError message={error} />
            <Button className="h-10" onClick={() => void start()} disabled={locating}>
              {locating ? <Loader2 className="animate-spin" aria-hidden /> : <QrIcon aria-hidden />}
              {locating ? 'Finding this location…' : 'Show the code'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
