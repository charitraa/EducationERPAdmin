import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { daysUntil, Expiry } from '@/components/data-display/Expiry'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Money, moneyInput } from '@/features/finance/components/money'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { useCrudState } from '@/hooks/useCrudState'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { isoDate, optionalIsoDate, optionalWholeNumber, wholeNumber } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Driver, Vehicle, VehicleDocument } from '../api/transport.api'
import {
  useCreateDocument,
  useCreateDriver,
  useCreateFuelLog,
  useCreateVehicle,
  useCreateVehicleMaintenance,
  useDocuments,
  useDrivers,
  useFuelLogs,
  useRemoveDocument,
  useRemoveDriver,
  useRemoveVehicle,
  useUpdateDocument,
  useUpdateDriver,
  useUpdateVehicle,
  useVehicleMaintenance,
  useVehicles,
} from '../hooks/useTransport'

const vehicleSchema = z.object({ campus: z.string().min(1, 'Choose a branch.'), registration_number: z.string().trim().min(1, 'Required.').max(30), name: z.string().trim().min(1, 'Required.').max(100), kind: z.string(), capacity: wholeNumber(), make: z.string().max(60), model: z.string().max(60), year: optionalWholeNumber, note: z.string().max(255), is_active: z.boolean() })

function VehicleDialog({ open, record, onOpenChange }: { open: boolean; record: Vehicle | null; onOpenChange: (o: boolean) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const create = useCreateVehicle()
  const update = useUpdateVehicle()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.name}` : 'Add vehicle'}
      schema={vehicleSchema}
      defaultValues={{ campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''), registration_number: record?.registration_number ?? '', name: record?.name ?? '', kind: record?.kind ?? 'bus', capacity: String(record?.capacity ?? ''), make: record?.make ?? '', model: record?.model ?? '', year: record?.year ? String(record.year) : '', note: record?.note ?? '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        const input = { ...v, campus: Number(v.campus), kind: v.kind as Vehicle['kind'] & string, capacity: Number(v.capacity), year: v.year ? Number(v.year) : null }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Vehicle saved.' : 'Vehicle added.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Registration no." required error={errors.registration_number?.message}>
              <Input {...register('registration_number')} className="font-mono uppercase" placeholder="BA 2 KHA 1234" />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Bus 1" />
            </FormField>
            <FormField label="Kind">
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('VehicleKindEnum')} />} />}
            </FormField>
            <FormField label="Seats" required error={errors.capacity?.message}>
              <Input {...register('capacity')} inputMode="numeric" />
            </FormField>
            <FormField label="Make" error={errors.make?.message}>
              <Input {...register('make')} placeholder="Tata" />
            </FormField>
            <FormField label="Model" error={errors.model?.message}>
              <Input {...register('model')} />
            </FormField>
            <FormField label="Year" error={errors.year?.message}>
              <Input {...register('year')} inputMode="numeric" />
            </FormField>
            {isMultiBranch && (
              <FormField label="Branch" required error={errors.campus?.message}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
          </div>
          <FormField label="Note">
            <Input {...register('note')} maxLength={255} />
          </FormField>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> In service
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

/** The fleet: every vehicle with its seats and status. */
export function VehiclesPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['kind', 'is_active'] })
  const query = useVehicles(list.query)
  const [creating, setCreating] = useState(false)
  const columns: Column<Vehicle>[] = [
    { id: 'reg', header: 'Registration', className: 'font-mono text-xs', cell: (v) => v.registration_number },
    { id: 'name', header: 'Vehicle', mobile: 'title', cell: (v) => <span className="font-medium">{v.name}</span> },
    { id: 'kind', header: 'Kind', cell: (v) => enumLabel('VehicleKindEnum', v.kind) },
    { id: 'seats', header: 'Seats', className: 'tabular-nums', cell: (v) => v.capacity },
    { id: 'make', header: 'Make', mobile: 'hidden', cell: (v) => [v.make, v.model, v.year].filter(Boolean).join(' ') || '—' },
    { id: 'status', header: '', cell: (v) => (v.is_active === false ? <StatusBadge status="inactive" label="Off the road" /> : null) },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Vehicles"
        columns={columns}
        query={query}
        list={list}
        getRowId={(v) => v.id}
        searchPlaceholder="Name or registration…"
        onRowClick={(v) => navigate(`/transport/vehicles/${v.id}`)}
        toolbar={
          <PermissionGate permission={PERMS.transport.manage}>
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden /> Add vehicle
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'kind', label: 'Kind', options: enumOptions('VehicleKindEnum') },
          { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'In service' }, { value: 'false', label: 'Off the road' }] },
        ]}
        empty={{ title: 'No vehicles yet' }}
      />
      <VehicleDialog open={creating} record={null} onOpenChange={setCreating} />
    </>
  )
}

const docSchema = z.object({ kind: z.string(), number: z.string().max(60), issued_on: optionalIsoDate, expires_on: optionalIsoDate, note: z.string().max(255) })
const money = z.union([z.literal(''), moneyInput])

/** One vehicle: its papers (with expiry warnings), servicing and fuel. */
export function VehicleDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const vehicles = useVehicles({ ...PICKER_PARAMS })
  const vehicle = vehicles.data?.results.find((v) => v.id === id)
  const docs = useDocuments({ ...PICKER_PARAMS, vehicle: id })
  const services = useVehicleMaintenance({ ...PICKER_PARAMS, vehicle: id })
  const fuel = useFuelLogs({ ...PICKER_PARAMS, vehicle: id })
  const createDoc = useCreateDocument()
  const updateDoc = useUpdateDocument()
  const removeDoc = useRemoveDocument()
  const addService = useCreateVehicleMaintenance()
  const addFuel = useCreateFuelLog()
  const removeVehicle = useRemoveVehicle()
  const { can } = usePermissions()
  const manage = can(PERMS.transport.manage)
  const [dialog, setDialog] = useState<'edit' | 'delete' | 'doc' | 'service' | 'fuel' | null>(null)
  const [doc, setDoc] = useState<VehicleDocument | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<VehicleDocument | null>(null)
  if (vehicles.isPending) return <PageLoader />
  if (vehicles.isError) return <ErrorState error={vehicles.error} onRetry={() => void vehicles.refetch()} />
  if (!vehicle) return <ErrorState error={new Error('No such vehicle.')} />
  const close = (o: boolean) => !o && (setDialog(null), setDoc(null))
  const attention = (docs.data?.results ?? []).filter((d) => (daysUntil(d.expires_on) ?? 99) <= 30)
  return (
    <div>
      <PageHeader
        backTo="/transport/vehicles"
        title={`${vehicle.name} · ${vehicle.registration_number}`}
        description={`${enumLabel('VehicleKindEnum', vehicle.kind)} · ${vehicle.capacity} seats${vehicle.make ? ` · ${[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}` : ''}`}
        actions={
          manage && (
            <>
              <Button variant="outline" onClick={() => setDialog('edit')}>
                <Pencil aria-hidden /> Edit
              </Button>
              <Button variant="outline" onClick={() => setDialog('delete')} aria-label="Delete vehicle">
                <Trash2 aria-hidden />
              </Button>
            </>
          )
        }
      />
      {attention.length > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm">
          <AlertTriangle className="h-4 w-4" aria-hidden /> {attention.map((d) => enumLabel('VehicleDocumentKindEnum', d.kind)).join(', ')} {attention.length === 1 ? 'needs' : 'need'} renewing.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="lg:col-span-2">
          <SectionHeader title="Papers" action={manage && <Button size="sm" onClick={() => setDialog('doc')}><Plus aria-hidden /> Add paper</Button>} />
          {(docs.data?.results ?? []).length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No papers on file: add the bluebook, insurance, route permit…</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {docs.data!.results.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                  <span className="flex-1 font-medium">{enumLabel('VehicleDocumentKindEnum', d.kind)}</span>
                  <span className="font-mono text-xs text-muted-foreground">{d.number || '—'}</span>
                  <Expiry on={d.expires_on} />
                  <RowActions
                    actions={[
                      { label: 'Renew / edit', icon: Pencil, permission: PERMS.transport.manage, onSelect: () => setDoc(d) },
                      { label: 'Delete', icon: Trash2, permission: PERMS.transport.manage, destructive: true, onSelect: () => setDeletingDoc(d) },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <SectionHeader title="Servicing" action={manage && <Button size="sm" variant="outline" onClick={() => setDialog('service')}><Plus aria-hidden /> Record</Button>} />
          {(services.data?.results ?? []).length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Nothing recorded.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {services.data!.results.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                  <span className="tabular-nums text-muted-foreground">{formatDate(m.date)}</span>
                  <span className="flex-1">
                    <span className="font-medium">{enumLabel('VehicleMaintenanceKindEnum', m.kind)}</span>
                    {m.description ? ` · ${m.description}` : ''}
                  </span>
                  {m.cost && <Money value={m.cost} />}
                  {m.next_due_on && <span className="w-full text-xs text-muted-foreground">Next due <Expiry on={m.next_due_on} /></span>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <SectionHeader title="Fuel" action={manage && <Button size="sm" variant="outline" onClick={() => setDialog('fuel')}><Plus aria-hidden /> Record</Button>} />
          {(fuel.data?.results ?? []).length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Nothing recorded.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {fuel.data!.results.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="tabular-nums text-muted-foreground">{formatDate(f.date)}</span>
                  <span className="flex-1 tabular-nums">{Number(f.litres)} L{f.odometer ? ` at ${f.odometer} km` : ''}</span>
                  <Money value={f.cost} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <VehicleDialog open={dialog === 'edit'} record={vehicle} onOpenChange={close} />
      <FormDialog
        open={dialog === 'doc' || doc != null}
        onOpenChange={close}
        title={doc ? `Renew ${enumLabel('VehicleDocumentKindEnum', doc.kind)}` : 'Add a paper'}
        schema={docSchema.refine((v) => !v.issued_on || !v.expires_on || v.expires_on >= v.issued_on, { path: ['expires_on'], message: 'Can’t expire before it was issued.' })}
        defaultValues={{ kind: doc?.kind ?? 'insurance', number: doc?.number ?? '', issued_on: doc?.issued_on ?? '', expires_on: doc?.expires_on ?? '', note: doc?.note ?? '' }}
        onSubmit={async (v) => {
          const input = { vehicle: id, kind: v.kind as VehicleDocument['kind'], number: v.number, issued_on: v.issued_on || null, expires_on: v.expires_on || null, note: v.note }
          if (doc) await updateDoc.mutateAsync({ id: doc.id, input })
          else await createDoc.mutateAsync(input)
          toast.success('Saved.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Paper">
                {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={doc != null} options={enumOptions('VehicleDocumentKindEnum')} />} />}
              </FormField>
              <FormField label="Number" error={errors.number?.message}>
                <Input {...register('number')} className="font-mono" />
              </FormField>
              <FormField label="Issued (AD)" error={errors.issued_on?.message}>
                {(p) => <Controller control={control} name="issued_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label="Expires (AD)" error={errors.expires_on?.message}>
                {(p) => <Controller control={control} name="expires_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
            <FormField label="Note">
              <Input {...register('note')} maxLength={255} />
            </FormField>
          </>
        )}
      </FormDialog>
      <FormDialog
        open={dialog === 'service'}
        onOpenChange={close}
        title="Record servicing"
        schema={z.object({ kind: z.string(), date: isoDate, odometer: optionalWholeNumber, cost: money, vendor: z.string().max(100), description: z.string().max(255), next_due_on: optionalIsoDate })}
        defaultValues={{ kind: 'service', date: todayIso(), odometer: '', cost: '', vendor: '', description: '', next_due_on: '' }}
        onSubmit={async (v) => {
          await addService.mutateAsync({ vehicle: id, kind: v.kind as never, date: v.date, odometer: v.odometer ? Number(v.odometer) : null, cost: v.cost || null, vendor: v.vendor, description: v.description, next_due_on: v.next_due_on || null })
          toast.success('Recorded.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Kind">
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('VehicleMaintenanceKindEnum')} />} />}
            </FormField>
            <FormField label="Date (AD)" required error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label="Odometer (km)" error={errors.odometer?.message}>
              <Input {...register('odometer')} inputMode="numeric" />
            </FormField>
            <FormField label="Cost" error={errors.cost?.message}>
              <Input {...register('cost')} inputMode="decimal" />
            </FormField>
            <FormField label="Garage">
              <Input {...register('vendor')} />
            </FormField>
            <FormField label="Next due (AD)" error={errors.next_due_on?.message}>
              {(p) => <Controller control={control} name="next_due_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label="Work done" className="sm:col-span-2">
              <Input {...register('description')} maxLength={255} />
            </FormField>
          </div>
        )}
      </FormDialog>
      <FormDialog
        open={dialog === 'fuel'}
        onOpenChange={close}
        title="Record fuel"
        schema={z.object({ date: isoDate, litres: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Litres, like 40 or 40.5.').refine((v) => Number(v) > 0, 'More than zero.'), cost: moneyInput, odometer: optionalWholeNumber, note: z.string().max(255) })}
        defaultValues={{ date: todayIso(), litres: '', cost: '', odometer: '', note: '' }}
        onSubmit={async (v) => {
          await addFuel.mutateAsync({ vehicle: id, date: v.date, litres: v.litres, cost: v.cost, odometer: v.odometer ? Number(v.odometer) : null, note: v.note })
          toast.success('Recorded.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date (AD)" required error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label="Litres" required error={errors.litres?.message}>
              <Input {...register('litres')} inputMode="decimal" />
            </FormField>
            <FormField label="Cost" required error={errors.cost?.message}>
              <Input {...register('cost')} inputMode="decimal" />
            </FormField>
            <FormField label="Odometer (km)" error={errors.odometer?.message}>
              <Input {...register('odometer')} inputMode="numeric" />
            </FormField>
          </div>
        )}
      </FormDialog>
      <DeleteDialog open={deletingDoc != null} onOpenChange={(o) => !o && setDeletingDoc(null)} subject="this paper" onConfirm={async () => { await removeDoc.mutateAsync(deletingDoc!.id); toast.success('Deleted.') }} />
      <DeleteDialog open={dialog === 'delete'} onOpenChange={close} subject={`“${vehicle.name}”`} description="Only possible if it never ran a route; otherwise take it off the road." onConfirm={async () => { await removeVehicle.mutateAsync(vehicle.id); toast.success('Deleted.'); navigate('/transport/vehicles') }} />
    </div>
  )
}

const driverSchema = z.object({ staff: z.string().min(1, 'Choose a staff member.'), role: z.string(), license_number: z.string().max(40), license_category: z.string().max(20), license_expires_on: optionalIsoDate, is_active: z.boolean() })

/** Drivers and assistants, with licence expiry. Crew members are staff. */
export function CrewPage() {
  const list = useListState({ filters: ['role', 'is_active'] })
  const query = useDrivers(list.query)
  const staff = useStaffOptions()
  const create = useCreateDriver()
  const update = useUpdateDriver()
  const remove = useRemoveDriver()
  const crud = useCrudState<Driver>()
  const columns: Column<Driver>[] = [
    { id: 'name', header: 'Name', mobile: 'title', cell: (d) => <span className="font-medium">{d.name}</span> },
    { id: 'role', header: 'Role', cell: (d) => enumLabel('CrewRoleEnum', d.role) },
    { id: 'phone', header: 'Phone', className: 'tabular-nums', cell: (d) => d.phone || '—' },
    { id: 'license', header: 'Licence', mobile: 'hidden', className: 'font-mono text-xs', cell: (d) => [d.license_number, d.license_category].filter(Boolean).join(' · ') || '—' },
    { id: 'expires', header: 'Licence expires', cell: (d) => <Expiry on={d.license_expires_on} /> },
    { id: 'status', header: '', cell: (d) => (d.is_active === false ? <StatusBadge status="inactive" label="Off duty" /> : null) },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Crew"
        columns={columns}
        query={query}
        list={list}
        getRowId={(d) => d.id}
        searchPlaceholder="Name or licence number…"
        toolbar={
          <PermissionGate permission={PERMS.transport.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add crew member
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'role', label: 'Role', options: enumOptions('CrewRoleEnum') },
          { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'On duty' }, { value: 'false', label: 'Off duty' }] },
        ]}
        rowActions={(d) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.transport.manage, onSelect: () => crud.openEdit(d) },
              { label: 'Delete', icon: Trash2, permission: PERMS.transport.manage, destructive: true, onSelect: () => crud.openDelete(d) },
            ]}
          />
        )}
        empty={{ title: 'No crew yet', description: 'Drivers and assistants are staff members; add them here with their licence.' }}
      />
      <FormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={crud.record ? `Edit ${crud.record.name}` : 'Add crew member'}
        schema={driverSchema}
        defaultValues={{ staff: crud.record ? String(crud.record.staff) : '', role: crud.record?.role ?? 'driver', license_number: crud.record?.license_number ?? '', license_category: crud.record?.license_category ?? '', license_expires_on: crud.record?.license_expires_on ?? '', is_active: crud.record?.is_active ?? true }}
        onSubmit={async (v) => {
          const input = { staff: Number(v.staff), role: v.role as Driver['role'], license_number: v.license_number, license_category: v.license_category, license_expires_on: v.license_expires_on || null, is_active: v.is_active }
          if (crud.record) await update.mutateAsync({ id: crud.record.id, input })
          else await create.mutateAsync(input)
          toast.success('Saved.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Staff member" required error={errors.staff?.message}>
                {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={crud.record != null} options={staff.data ?? []} />} />}
              </FormField>
              <FormField label="Role">
                {(p) => <Controller control={control} name="role" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('CrewRoleEnum')} />} />}
              </FormField>
              <FormField label="Licence no." error={errors.license_number?.message}>
                <Input {...register('license_number')} className="font-mono" />
              </FormField>
              <FormField label="Category" error={errors.license_category?.message}>
                <Input {...register('license_category')} placeholder="B, C, D…" />
              </FormField>
              <FormField label="Expires (AD)" error={errors.license_expires_on?.message}>
                {(p) => <Controller control={control} name="license_expires_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
            <Controller control={control} name="is_active" render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> On duty
              </label>
            )} />
          </>
        )}
      </FormDialog>
      {crud.deleting && <DeleteDialog open onOpenChange={(o) => !o && crud.closeDelete()} subject={crud.deleting.name} onConfirm={async () => { await remove.mutateAsync(crud.deleting!.id); toast.success('Deleted.') }} />}
    </>
  )
}
