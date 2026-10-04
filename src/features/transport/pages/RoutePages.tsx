import { CalendarX, Files, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useTerms } from '@/features/academics/terms/hooks/useTerms'
import { Money, moneyInput } from '@/features/finance/components/money'
import { useCategoryOptions } from '@/features/finance/hooks/useFinance'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { hhmm } from '@/features/timetable/api/timetable.api'
import { useCrudState } from '@/hooks/useCrudState'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { code, isoDate, optionalIsoDate, wholeNumber } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Rider, Route, RouteInput, Stop } from '../api/transport.api'
import {
  useAssignRider,
  useCreateRoute,
  useCreateStop,
  useEndRider,
  useFleetOptions,
  useRemoveRoute,
  useRemoveStop,
  useRiders,
  useRoute,
  useRouteOptions,
  useRoutes,
  useTransportInvoices,
  useUpdateRoute,
  useUpdateStop,
} from '../hooks/useTransport'

const fee = z.union([z.literal(''), moneyInput])
const routeSchema = z.object({ campus: z.string().min(1, 'Choose a branch.'), code, name: z.string().trim().min(1, 'Required.').max(100), vehicle: z.string(), driver: z.string(), assistant: z.string(), fee_per_term: fee, fee_category: z.string(), is_active: z.boolean() })

function RouteDialog({ open, record, onOpenChange }: { open: boolean; record: Route | null; onOpenChange: (o: boolean) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const fleet = useFleetOptions()
  const categories = useCategoryOptions()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const create = useCreateRoute()
  const update = useUpdateRoute()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? 'Edit route' : 'New route'}
      description="The fee is the default per term; a stop can have its own."
      schema={routeSchema}
      defaultValues={{
        campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''),
        code: record?.code ?? '',
        name: record?.name ?? '',
        vehicle: record?.vehicle ? String(record.vehicle) : '',
        driver: record?.driver ? String(record.driver) : '',
        assistant: record?.assistant ? String(record.assistant) : '',
        fee_per_term: record?.fee_per_term ?? '',
        fee_category: record?.fee_category ? String(record.fee_category) : '',
        is_active: record?.is_active ?? true,
      }}
      onSubmit={async (v) => {
        const id = (x: string) => (x ? Number(x) : null)
        const input: RouteInput = { campus: Number(v.campus), code: v.code, name: v.name, vehicle: id(v.vehicle), driver: id(v.driver), assistant: id(v.assistant), fee_per_term: v.fee_per_term || '0', fee_category: id(v.fee_category), is_active: v.is_active }
        if (record) {
          await update.mutateAsync({ id: record.id, input })
          toast.success('Route saved.')
        } else {
          const r = await create.mutateAsync(input)
          toast.success('Route added. Add its stops next.')
          navigate(`/transport/routes/${r.id}`)
        }
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} placeholder="r1" />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Route 1: Koteshwor – Campus" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Vehicle" error={errors.vehicle?.message}>
              {(p) => <Controller control={control} name="vehicle" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={fleet.vehicles} />} />}
            </FormField>
            <FormField label="Driver" error={errors.driver?.message}>
              {(p) => <Controller control={control} name="driver" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={fleet.drivers} />} />}
            </FormField>
            <FormField label="Assistant" error={errors.assistant?.message}>
              {(p) => <Controller control={control} name="assistant" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={fleet.assistants} />} />}
            </FormField>
            {isMultiBranch && (
              <FormField label="Branch" required error={errors.campus?.message}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
            <FormField label="Fee per term" error={errors.fee_per_term?.message}>
              <Input {...register('fee_per_term')} inputMode="decimal" className="tabular-nums" />
            </FormField>
            {can(PERMS.finance.view) && (
              <FormField label="Fee category">
                {(p) => <Controller control={control} name="fee_category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="None (not billed)" options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />} />}
              </FormField>
            )}
          </div>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> Running
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

/** Every route with its vehicle, crew and riders. */
export function RoutesPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['is_active'] })
  const query = useRoutes(list.query)
  const [creating, setCreating] = useState(false)
  const columns: Column<Route>[] = [
    { id: 'name', header: 'Route', mobile: 'title', cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'stops', header: 'Stops', className: 'tabular-nums', cell: (r) => r.stops.length },
    { id: 'vehicle', header: 'Vehicle', cell: (r) => r.vehicle_name ?? '—' },
    { id: 'crew', header: 'Crew', cell: (r) => [r.driver_name, r.assistant_name].filter(Boolean).join(', ') || '—' },
    { id: 'riders', header: 'Riders', className: 'tabular-nums', cell: (r) => r.riders },
    { id: 'fee', header: 'Fee / term', className: 'text-right', cell: (r) => <Money value={r.fee_per_term} /> },
    { id: 'status', header: '', cell: (r) => (r.is_active === false ? <StatusBadge status="inactive" label="Not running" /> : null) },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Routes"
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder="Route or stop name…"
        onRowClick={(r) => navigate(`/transport/routes/${r.id}`)}
        toolbar={
          <PermissionGate permission={PERMS.transport.manage}>
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden /> New route
            </Button>
          </PermissionGate>
        }
        filters={[{ name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'Running' }, { value: 'false', label: 'Not running' }] }]}
        empty={{ title: 'No routes yet', description: 'Add vehicles and crew, then routes with their stops.' }}
      />
      <RouteDialog open={creating} record={null} onOpenChange={setCreating} />
    </>
  )
}

const time = z.union([z.literal(''), z.string().regex(/^\d{2}:\d{2}/, 'HH:MM')])
const stopSchema = z.object({ sequence: wholeNumber(), name: z.string().trim().min(1, 'Required.').max(100), landmark: z.string().max(200), pickup_time: time, drop_time: time, fee_per_term: fee })

function StopDialog({ route, open, record, onOpenChange }: { route: Route; open: boolean; record: Stop | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateStop()
  const update = useUpdateStop()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.name}` : 'Add a stop'}
      description="Stops are picked up in order. Leave the fee empty to use the route’s."
      schema={stopSchema}
      defaultValues={{ sequence: String(record?.sequence ?? route.stops.length + 1), name: record?.name ?? '', landmark: record?.landmark ?? '', pickup_time: hhmm(record?.pickup_time), drop_time: hhmm(record?.drop_time), fee_per_term: record?.fee_per_term ?? '' }}
      onSubmit={async (v) => {
        const input = { route: route.id, sequence: Number(v.sequence), name: v.name, landmark: v.landmark, pickup_time: v.pickup_time || null, drop_time: v.drop_time || null, fee_per_term: v.fee_per_term || null }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Stop saved.' : 'Stop added.')
      }}
    >
      {({ register, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[5rem_1fr]">
            <FormField label="Order" required error={errors.sequence?.message}>
              <Input {...register('sequence')} inputMode="numeric" />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Koteshwor Chowk" />
            </FormField>
          </div>
          <FormField label="Landmark" error={errors.landmark?.message}>
            <Input {...register('landmark')} placeholder="In front of the petrol pump" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Pickup at" error={errors.pickup_time?.message}>
              <Input type="time" {...register('pickup_time')} />
            </FormField>
            <FormField label="Drop at" error={errors.drop_time?.message}>
              <Input type="time" {...register('drop_time')} />
            </FormField>
            <FormField label="Fee per term" error={errors.fee_per_term?.message}>
              <Input {...register('fee_per_term')} inputMode="decimal" placeholder="Route’s" />
            </FormField>
          </div>
        </>
      )}
    </FormDialog>
  )
}

/** One route: its stops in order with times and fees, and who rides it. */
export function RouteDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const route = useRoute(Number.isFinite(id) ? id : null)
  const riders = useRiders({ ...PICKER_PARAMS, route: id })
  const removeRoute = useRemoveRoute()
  const removeStop = useRemoveStop()
  const { can } = usePermissions()
  const [dialog, setDialog] = useState<'edit' | 'delete' | 'stop' | null>(null)
  const [editingStop, setEditingStop] = useState<Stop | null>(null)
  const [deletingStop, setDeletingStop] = useState<Stop | null>(null)
  if (route.isPending) return <PageLoader />
  if (route.isError) return <ErrorState error={route.error} onRetry={() => void route.refetch()} />
  const r = route.data
  const current = (riders.data?.results ?? []).filter((x) => !x.end_date || x.end_date >= todayIso())
  return (
    <div>
      <PageHeader
        backTo="/transport/routes"
        title={r.name}
        description={[r.vehicle_name, r.driver_name && `driver ${r.driver_name}`, r.assistant_name && `assistant ${r.assistant_name}`].filter(Boolean).join(' · ') || 'No vehicle or crew yet'}
        actions={
          can(PERMS.transport.manage) && (
            <>
              <Button variant="outline" onClick={() => setDialog('edit')}>
                <Pencil aria-hidden /> Edit
              </Button>
              <Button variant="outline" onClick={() => setDialog('delete')} aria-label="Delete route">
                <Trash2 aria-hidden />
              </Button>
            </>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader
            title="Stops"
            action={
              can(PERMS.transport.manage) && (
                <Button size="sm" onClick={() => setDialog('stop')}>
                  <Plus aria-hidden /> Add stop
                </Button>
              )
            }
          />
          {r.stops.length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No stops yet.</p>
          ) : (
            <ol className="divide-y rounded-lg border bg-card text-sm">
              {[...r.stops].sort((a, b) => a.sequence - b.sequence).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                  <span className="w-6 tabular-nums text-muted-foreground">{s.sequence}.</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{s.name}</span>
                    {s.landmark && <span className="block text-xs text-muted-foreground">{s.landmark}</span>}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {hhmm(s.pickup_time) || '—'} / {hhmm(s.drop_time) || '—'}
                  </span>
                  <Money value={s.fee} />
                  <RowActions
                    actions={[
                      { label: 'Edit', icon: Pencil, permission: PERMS.transport.manage, onSelect: () => setEditingStop(s) },
                      { label: 'Delete', icon: Trash2, permission: PERMS.transport.manage, destructive: true, onSelect: () => setDeletingStop(s) },
                    ]}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <SectionHeader title={`Riders · ${current.length}`} />
          {current.length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Nobody rides this route yet. Add them under Riders.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {current.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="flex-1 font-medium">{x.rider_name}</span>
                  <span className="text-muted-foreground">{x.stop_name}</span>
                  <span className="text-xs text-muted-foreground">{enumLabel('RideDirectionEnum', x.direction)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <RouteDialog open={dialog === 'edit'} record={r} onOpenChange={(o) => !o && setDialog(null)} />
      <StopDialog route={r} open={dialog === 'stop' || editingStop != null} record={editingStop} onOpenChange={(o) => !o && (setDialog(null), setEditingStop(null))} />
      <DeleteDialog open={deletingStop != null} onOpenChange={(o) => !o && setDeletingStop(null)} subject={deletingStop ? `the stop “${deletingStop.name}”` : 'this stop'} onConfirm={async () => { await removeStop.mutateAsync(deletingStop!.id); toast.success('Stop deleted.') }} />
      <DeleteDialog open={dialog === 'delete'} onOpenChange={(o) => !o && setDialog(null)} subject={`“${r.name}”`} description="Only possible for a route that never had riders or trips; otherwise mark it not running." onConfirm={async () => { await removeRoute.mutateAsync(r.id); toast.success('Route deleted.'); navigate('/transport/routes') }} />
    </div>
  )
}

const riderSchema = z
  .object({ route: z.string().min(1, 'Choose a route.'), stop: z.string().min(1, 'Choose a stop.'), who: z.enum(['student', 'staff']), student: z.custom<Student | null>(), staff: z.string(), direction: z.string(), start_date: isoDate })
  .refine((v) => (v.who === 'student' ? v.student != null : v.staff !== ''), { path: ['staff'], message: 'Choose the rider.' })

function AssignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { routes, options } = useRouteOptions()
  const staff = useStaffOptions()
  const assign = useAssignRider()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Put someone on a route"
      description="A rider is billed by their stop’s fee (or the route’s) each term they ride."
      submitLabel="Add rider"
      schema={riderSchema}
      defaultValues={{ route: '', stop: '', who: 'student' as 'student' | 'staff', student: null, staff: '', direction: 'both', start_date: todayIso() }}
      onSubmit={async (v) => {
        const r = await assign.mutateAsync({ route: Number(v.route), stop: Number(v.stop), ...(v.who === 'student' ? { student: v.student!.id } : { staff: Number(v.staff) }), direction: v.direction as Rider['direction'], start_date: v.start_date })
        toast.success(`${r.rider_name} rides ${r.route_name} from ${r.stop_name}.`)
      }}
    >
      {({ control, watch, setValue, formState: { errors } }) => {
        const route = routes.find((r) => String(r.id) === watch('route'))
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Route" required error={errors.route?.message}>
                {(p) => <Controller control={control} name="route" render={({ field }) => <SelectControl {...p} value={field.value} onChange={(v) => (field.onChange(v), setValue('stop', ''))} options={options} />} />}
              </FormField>
              <FormField label="Stop" required error={errors.stop?.message}>
                {(p) => <Controller control={control} name="stop" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={!route} options={(route?.stops ?? []).map((s) => ({ value: String(s.id), label: `${s.sequence}. ${s.name}` }))} />} />}
              </FormField>
              <FormField label="Rider is">
                {(p) => <Controller control={control} name="who" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={[{ value: 'student', label: 'A student' }, { value: 'staff', label: 'A staff member' }]} />} />}
              </FormField>
              <FormField label="Rides">
                {(p) => <Controller control={control} name="direction" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('RideDirectionEnum')} />} />}
              </FormField>
            </div>
            {watch('who') === 'student' ? (
              <FormField label="Student" required error={errors.staff?.message}>
                {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
              </FormField>
            ) : (
              <FormField label="Staff member" required error={errors.staff?.message}>
                {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} />} />}
              </FormField>
            )}
            <FormField label="From (AD)" required error={errors.start_date?.message}>
              {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
          </>
        )
      }}
    </FormDialog>
  )
}

function BillDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const bill = useTransportInvoices()
  const terms = useTerms({ ...PICKER_PARAMS, ordering: '-start_date' })
  const { options } = useRouteOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Bill a term’s transport fees"
      description="One invoice per student rider, prorated by the days they rode. Students already billed for the term are skipped."
      submitLabel="Generate invoices"
      schema={z.object({ term: z.string().min(1, 'Choose a term.'), route: z.string(), due_date: optionalIsoDate })}
      defaultValues={{ term: '', route: '', due_date: '' }}
      onSubmit={async (v) => {
        const r = await bill.mutateAsync({ term: Number(v.term), ...(v.route ? { route: Number(v.route) } : {}), ...(v.due_date ? { due_date: v.due_date } : {}) })
        const notes = [r.skipped && `${r.skipped} already billed`, r.not_enrolled && `${r.not_enrolled} not enrolled that term`, r.routes_without_fee_category.length && `no fee category on ${r.routes_without_fee_category.join(', ')}`].filter(Boolean)
        toast.success(`${r.created} invoice${r.created === 1 ? '' : 's'} generated${notes.length ? ` (${notes.join('; ')})` : ''}.`)
      }}
    >
      {({ control, formState: { errors } }) => (
        <>
          <FormField label="Term" required error={errors.term?.message}>
            {(p) => <Controller control={control} name="term" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(terms.data?.results ?? []).map((t) => ({ value: String(t.id), label: t.name }))} />} />}
          </FormField>
          <FormField label="Route">
            {(p) => <Controller control={control} name="route" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Every route" options={options} />} />}
          </FormField>
          <FormField label="Due date (AD)" error={errors.due_date?.message}>
            {(p) => <Controller control={control} name="due_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** Who rides which route from which stop, past and present. */
export function RidersPage() {
  const list = useListState({ filters: ['route', 'direction'] })
  const query = useRiders(list.query)
  const { options } = useRouteOptions()
  const end = useEndRider()
  const crud = useCrudState<Rider>()
  const [dialog, setDialog] = useState<'assign' | 'bill' | null>(null)
  const columns: Column<Rider>[] = [
    { id: 'who', header: 'Rider', mobile: 'title', cell: (r) => <span className="font-medium">{r.rider_name}{r.staff != null && <span className="ml-1 text-xs font-normal text-muted-foreground">(staff)</span>}</span> },
    { id: 'route', header: 'Route', cell: (r) => r.route_name },
    { id: 'stop', header: 'Stop', cell: (r) => r.stop_name },
    { id: 'times', header: 'Pickup / drop', mobile: 'hidden', className: 'tabular-nums', cell: (r) => `${hhmm(r.pickup_time) || '—'} / ${hhmm(r.drop_time) || '—'}` },
    { id: 'direction', header: 'Rides', cell: (r) => enumLabel('RideDirectionEnum', r.direction) },
    { id: 'from', header: 'From', className: 'tabular-nums', cell: (r) => formatDate(r.start_date) },
    { id: 'to', header: 'Until', className: 'tabular-nums', cell: (r) => (r.end_date ? formatDate(r.end_date) : <span className="text-info">Riding</span>) },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Riders"
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder="Rider name or number…"
        toolbar={
          <PermissionGate permission={PERMS.transport.manage}>
            <Button variant="outline" onClick={() => setDialog('bill')}>
              <Files aria-hidden /> Bill a term
            </Button>
            <Button onClick={() => setDialog('assign')}>
              <UserPlus aria-hidden /> Add rider
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'route', label: 'Route', options },
          { name: 'direction', label: 'Rides', options: enumOptions('RideDirectionEnum') },
        ]}
        rowActions={(r) => <RowActions actions={[{ label: 'Stop riding', icon: CalendarX, permission: PERMS.transport.manage, hidden: r.end_date != null, onSelect: () => crud.openEdit(r) }]} />}
        empty={{ title: 'No riders yet' }}
      />
      <AssignDialog open={dialog === 'assign'} onOpenChange={(o) => !o && setDialog(null)} />
      <BillDialog open={dialog === 'bill'} onOpenChange={(o) => !o && setDialog(null)} />
      <FormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={crud.record ? `${crud.record.rider_name} stops riding` : 'Stop riding'}
        description="The last day they ride. Later trips no longer expect them."
        submitLabel="Stop riding"
        schema={z.object({ on: isoDate, reason: z.string().max(255) })}
        defaultValues={{ on: todayIso(), reason: '' }}
        onSubmit={async (v) => {
          await end.mutateAsync({ id: crud.record!.id, on: v.on, reason: v.reason })
          toast.success('Done.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label="Last day (AD)" required error={errors.on?.message}>
              {(p) => <Controller control={control} name="on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label="Reason">
              <Input {...register('reason')} maxLength={255} placeholder="Moved house" />
            </FormField>
          </>
        )}
      </FormDialog>
    </>
  )
}
