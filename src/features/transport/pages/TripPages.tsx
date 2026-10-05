import { Bus, Check, CheckCheck, Flag, Loader2, X } from 'lucide-react'
import { useId, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader, TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime, todayIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import { hhmm } from '@/features/timetable/api/timetable.api'
import type { BoardingStatus, Route } from '../api/transport.api'
import { useCompleteTrip, useMarkTrip, useOpenTrip, useRouteOptions, useTrip, useTrips } from '../hooks/useTransport'
import { tr } from '@/lib/i18n'

const DIRECTIONS = ['pickup', 'drop'] as const

/** The day's runs: every active route's pickup and drop, open to mark who boarded. */
export function TripsPage() {
  const [params, setParams] = useSearchParams()
  const date = params.get('date') ?? todayIso()
  const navigate = useNavigate()
  const { routes } = useRouteOptions()
  const trips = useTrips({ ...PICKER_PARAMS, date })
  const open = useOpenTrip()
  const { can } = usePermissions()
  const [opening, setOpening] = useState<string | null>(null)
  const dateId = useId()
  const tripFor = (route: Id, direction: string) => trips.data?.results.find((t) => t.route === route && t.direction === direction)

  const go = async (r: Route, direction: 'pickup' | 'drop') => {
    const existing = tripFor(r.id, direction)
    if (existing) return navigate(`/transport/trips/${existing.id}`)
    setOpening(`${r.id}-${direction}`)
    try {
      const t = await open.mutateAsync({ route: r.id, direction, date })
      navigate(`/transport/trips/${t.id}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setOpening(null)
    }
  }

  return (
    <>
      <div className="mb-4 grid max-w-48 gap-1.5">
        <Label htmlFor={dateId}>{tr('Date (AD)')}</Label>
        <DatePicker id={dateId} value={date} onChange={(v) => setParams(v && v !== todayIso() ? { date: v } : {}, { replace: true })} />
      </div>
      {trips.isPending ? (
        <TableSkeleton rows={4} columns={3} />
      ) : trips.isError ? (
        <ErrorState error={trips.error} onRetry={() => void trips.refetch()} />
      ) : routes.length === 0 ? (
        <EmptyState title={tr('No routes running')} description={tr('Add routes with their stops, vehicle and crew.')} icon={Bus} />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {routes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[r.vehicle_name, r.driver_name && tr('driver {driver_name}', { driver_name: r.driver_name }), tr('{riders} riders', { riders: r.riders })].filter(Boolean).join(' · ')}
                </p>
              </div>
              {DIRECTIONS.map((d) => {
                const t = tripFor(r.id, d)
                const busy = opening === `${r.id}-${d}`
                return (
                  <Button key={d} size="sm" variant={t ? 'outline' : 'default'} disabled={opening != null || (!t && !can(PERMS.transport.manage))} onClick={() => void go(r, d)}>
                    {busy && <Loader2 className="animate-spin" aria-hidden />}
                    {d === 'pickup' ? tr('Pickup') : tr('Drop')}
                    {t ? ` · ${t.status === 'completed' ? 'done' : 'open'}` : ''}
                  </Button>
                )
              })}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{tr('Trips for {date}. Crew members can also open and mark their own route’s trips.', { date: formatDate(date) })}</p>
    </>
  )
}

/** One run: who's expected at each stop, marked boarded or absent with one tap, then completed. */
export function TripPage() {
  const id = Number(useParams().id)
  const trip = useTrip(Number.isFinite(id) ? id : null)
  const mark = useMarkTrip()
  const complete = useCompleteTrip()
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  if (trip.isPending) return <PageLoader />
  if (trip.isError) return <ErrorState error={trip.error} onRetry={() => void trip.refetch()} />
  const t = trip.data
  const done = t.status === 'completed'
  const unmarked = t.roster.filter((r) => r.status == null)
  const boarded = t.roster.filter((r) => r.status === 'boarded').length
  const absent = t.roster.filter((r) => r.status === 'absent').length

  const set = async (entries: Array<{ assignment: Id; status: BoardingStatus }>) => {
    setError(null)
    try {
      await mark.mutateAsync({ id, entries })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  // Stops in order: the roster keeps the route's stop order.
  const stops = [...new Map(t.roster.map((r) => [r.stop, r.stop_name])).entries()]

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        backTo={`/transport?date=${t.date}`}
        title={`${t.route_name} · ${enumLabel('TripDirectionEnum', t.direction)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatDate(t.date)}
            {t.vehicle_name ? ` · ${t.vehicle_name}` : ''}
            <StatusBadge status={done ? 'completed' : 'open'} label={enumLabel('TripStatusEnum', t.status)} />
          </span>
        }
      />
      <p className="mb-3 flex flex-wrap gap-3 text-sm">
        <span className="font-medium text-success">{tr('{boarded} boarded', { boarded })}</span>
        <span className="font-medium text-danger">{tr('{absent} absent', { absent })}</span>
        {unmarked.length > 0 && <span className="text-muted-foreground">{tr('{count} not marked', { count: unmarked.length })}</span>}
        <span className="ml-auto text-muted-foreground">{tr('{count} riders', { count: t.roster.length })}</span>
      </p>
      {done && t.completed_at && <p className="mb-3 rounded-lg border border-info/20 bg-info-soft p-3 text-sm">{tr('Completed {dateTime}.', { dateTime: formatDateTime(t.completed_at) })}</p>}
      {t.roster.length === 0 ? (
        <EmptyState title={tr('Nobody rides this trip')} description={tr('Put riders on the route under Riders.')} />
      ) : (
        <div className="grid gap-4">
          {stops.map(([stopId, stopName]) => (
            <section key={stopId} className="rounded-lg border bg-card">
              <h2 className="border-b px-4 py-2 text-sm font-semibold">{stopName}</h2>
              <ul className="divide-y">
                {t.roster
                  .filter((r) => r.stop === stopId)
                  .map((r) => (
                    <li key={r.assignment} className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
                      <span className="min-w-0 flex-1 font-medium">
                        {r.rider_name}
                        {r.staff != null && <span className="ml-1 text-xs font-normal text-muted-foreground">{tr('(staff)')}</span>}
                        {r.at && <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">{hhmm(r.at)}</span>}
                      </span>
                      {done ? (
                        r.status ? <StatusBadge status={r.status === 'boarded' ? 'completed' : 'rejected'} label={enumLabel('BoardingStatusEnum', r.status)} /> : <span className="text-xs text-muted-foreground">{tr('Not marked')}</span>
                      ) : (
                        <div className="flex gap-1.5" role="group" aria-label={tr('Boarding for {rider_name}', { rider_name: r.rider_name })}>
                          {(['boarded', 'absent'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              aria-pressed={r.status === s}
                              disabled={mark.isPending}
                              onClick={() => void set([{ assignment: r.assignment, status: s }])}
                              className={cn(
                                'inline-flex h-10 items-center gap-1 rounded-md border px-3 text-sm font-medium',
                                r.status === s ? (s === 'boarded' ? 'border-success bg-success text-white' : 'border-danger bg-danger text-white') : 'text-muted-foreground hover:bg-muted',
                              )}
                            >
                              {s === 'boarded' ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
                              {s === 'boarded' ? tr('Boarded') : tr('Absent')}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {!done && t.roster.length > 0 && (
        <div className="sticky bottom-16 z-20 mt-4 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
          <FormError message={error} className="mb-2" />
          <div className="flex flex-wrap items-center gap-2">
            {unmarked.length > 0 && (
              <Button variant="outline" onClick={() => void set(unmarked.map((r) => ({ assignment: r.assignment, status: 'boarded' as const })))} disabled={mark.isPending}>
                <CheckCheck aria-hidden /> {tr('Mark the other {count} boarded', { count: unmarked.length })}
              </Button>
            )}
            <Button className="ml-auto" onClick={() => setCompleting(true)}>
              <Flag aria-hidden /> {tr('Complete trip')}
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={completing}
        onOpenChange={setCompleting}
        title={tr('Complete this trip?')}
        description={unmarked.length ? (unmarked.length === 1 ? tr('1 rider is not marked.') : tr('{count} riders are not marked.', { count: unmarked.length })) : tr('Everyone is marked.')}
        confirmLabel={tr('Complete')}
        onConfirm={async () => {
          await complete.mutateAsync(id)
          toast.success(tr('Trip completed.'))
        }}
      />
    </div>
  )
}
