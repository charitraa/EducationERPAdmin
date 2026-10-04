import { CircleCheck, Clock, Loader2, MapPin, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumLabel } from '@/lib/formatters'
import { ApiError, toApiError } from '@/shared/api/errors'
import { AuthLayout } from '@/features/authentication/components/AuthLayout'
import { punchesApi, sessionsApi, type ScanInput } from '../api/attendance.api'
import { currentPosition } from '../components/QrPresenter'

const DEVICE_KEY = 'erp.attendance-device'

/** A random id kept on this phone, so one phone can't mark several students in a class. */
function deviceId(): string | undefined {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return undefined
  }
}

type Outcome = { tone: 'success' | 'info'; title: string; detail: string }
type State = { step: 'scanning' } | { step: 'locating' } | { step: 'done'; outcome: Outcome } | { step: 'failed'; message: string; needsLocation: boolean }

/**
 * Where an attendance QR code leads: `/scan/class?t=…` (students) or
 * `/scan/staff?t=…` (staff check-in). Sent with the scanner's own login.
 */
export default function ScanPage() {
  const kind = useParams().kind === 'staff' ? 'staff' : 'class'
  const token = useSearchParams()[0].get('t') ?? ''
  const { user } = useAuth()
  const [state, setState] = useState<State>({ step: 'scanning' })

  const send = useCallback(
    async (where?: Pick<ScanInput, 'latitude' | 'longitude'>): Promise<Outcome> => {
      if (kind === 'staff') {
        const punch = await punchesApi.checkIn({ token, ...where })
        return { tone: 'success', title: 'Check-in recorded', detail: `${formatDateTime(punch.punched_at)}. Scan again when you leave.` }
      }
      const res = await sessionsApi.scan({ token, ...where, device_id: deviceId() })
      const status = enumLabel('AttendanceStatusEnum', res.status).toLowerCase()
      return res.already_marked
        ? { tone: 'info', title: 'Already marked', detail: `You were marked ${status} in this class before.` }
        : { tone: 'success', title: `You're marked ${status}`, detail: 'Your teacher can see it now. You can close this page.' }
    },
    [kind, token],
  )

  const withLocation = useCallback(async () => {
    setState({ step: 'locating' })
    try {
      const { coords } = await currentPosition()
      setState({ step: 'scanning' })
      setState({ step: 'done', outcome: await send({ latitude: Number(coords.latitude.toFixed(6)), longitude: Number(coords.longitude.toFixed(6)) }) })
    } catch (err) {
      // Not an ApiError: this phone couldn't (or wouldn't) say where it is.
      if (err instanceof ApiError) setState({ step: 'failed', message: errorMessage(err), needsLocation: err.code === 'location_required' })
      else setState({ step: 'failed', message: (err as Error).message, needsLocation: true })
    }
  }, [send])

  // The code works for a minute; scan at once. StrictMode mustn't send it twice.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !token) return
    started.current = true
    send()
      .then((outcome) => setState({ step: 'done', outcome }))
      .catch((err) => {
        // The code only works near where it's shown: ask for this phone's location and try again.
        if (toApiError(err).code === 'location_required') void withLocation()
        else setState({ step: 'failed', message: errorMessage(err), needsLocation: false })
      })
  }, [send, token, withLocation])

  const home = (
    <span className="flex flex-wrap gap-x-4">
      <Link to="/me" className="font-medium text-primary hover:underline">
        My account
      </Link>
      <Link to="/" className="hover:text-foreground">
        Dashboard
      </Link>
    </span>
  )
  const who = user ? `Signed in as ${user.full_name || user.email}.` : undefined
  const heading = kind === 'staff' ? 'Staff check-in' : 'Class attendance'

  if (!token)
    return (
      <AuthLayout title={heading} subtitle={who} footer={home}>
        <Problem message="This link has no code in it. Scan the QR code on screen with your phone's camera." />
      </AuthLayout>
    )

  if (state.step === 'done')
    return (
      <AuthLayout title={state.outcome.title} subtitle={who} footer={home}>
        <div role="status" className={`flex gap-3 rounded-md border p-4 text-sm ${state.outcome.tone === 'success' ? 'bg-success-soft text-success' : 'bg-info-soft text-info'}`}>
          {state.outcome.tone === 'success' ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
          <p>{state.outcome.detail}</p>
        </div>
      </AuthLayout>
    )

  if (state.step === 'failed')
    return (
      <AuthLayout title="That didn't work" subtitle={who} footer={home}>
        <Problem message={state.message} />
        {state.needsLocation && (
          <Button className="mt-4 h-10 w-full" onClick={() => void withLocation()}>
            <MapPin aria-hidden /> Share my location and try again
          </Button>
        )}
        <p className="mt-4 text-sm text-muted-foreground">Code expired? Scan the one on screen again; it changes every few seconds.</p>
      </AuthLayout>
    )

  return (
    <AuthLayout title={heading} subtitle={who}>
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {state.step === 'locating' ? 'This code only works nearby. Finding where you are…' : 'Recording your scan…'}
      </p>
    </AuthLayout>
  )
}

function Problem({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-3 rounded-md border bg-warning-soft p-4 text-sm text-warning">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  )
}
