import { ArrowRightLeft, Ban, Pencil, Plus, Undo2, UserPlus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
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
import { useDepartmentOptions } from '@/features/academics/departments/hooks/useDepartments'
import { useRoomOptions } from '@/features/academics/rooms/hooks/useRooms'
import { Money, moneyInput } from '@/features/finance/components/money'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { optionalIsoDate } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Asset, AssetCondition, Disposal, Maintenance } from '../api/inventory.api'
import {
  useAsset,
  useAssets,
  useAssignAsset,
  useAssignments,
  useCreateAsset,
  useDisposeAsset,
  useInventoryOptions,
  useMaintenance,
  useMoveAsset,
  useReturnAsset,
  useScheduleMaintenance,
  useUpdateAsset,
} from '../hooks/useInventory'

const TONE: Record<string, StatusTone> = { in_store: 'success', assigned: 'info', maintenance: 'warning', disposed: 'muted' }

export function AssetStatus({ status }: { status: Asset['status'] }) {
  return <StatusBadge status={status === 'in_store' ? 'active' : status === 'disposed' ? 'archived' : 'open'} tone={TONE[status]} label={enumLabel('AssetStatusEnum', status)} />
}

const money = z.union([z.literal(''), moneyInput])
const assetSchema = z.object({ item: z.string().min(1, 'Choose an item.'), store: z.string().min(1, 'Choose a store.'), serial_number: z.string().max(100), condition: z.string(), cost: money, purchased_on: optionalIsoDate, warranty_until: optionalIsoDate, note: z.string().max(255) })

/** Registering outside a purchase (donated, or the opening register). Edit keeps item and store fixed. */
function AssetDialog({ open, record, onOpenChange }: { open: boolean; record: Asset | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateAsset()
  const update = useUpdateAsset()
  const navigate = useNavigate()
  const { items, stores } = useInventoryOptions('asset')
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? `Edit ${record.tag}` : 'Register an asset'}
      description={record ? 'Where it is and who has it change through the asset’s actions.' : 'For donations and the opening register. Assets bought through a purchase order are registered when the delivery is received.'}
      schema={assetSchema}
      defaultValues={{
        item: record ? String(record.item) : '',
        store: record ? String(record.store) : '',
        serial_number: record?.serial_number ?? '',
        condition: record?.condition ?? 'new',
        cost: record?.cost ?? '',
        purchased_on: record?.purchased_on ?? '',
        warranty_until: record?.warranty_until ?? '',
        note: record?.note ?? '',
      }}
      onSubmit={async (v) => {
        const common = { serial_number: v.serial_number, condition: v.condition as AssetCondition, cost: v.cost || null, purchased_on: v.purchased_on || null, warranty_until: v.warranty_until || null, note: v.note }
        if (record) {
          await update.mutateAsync({ id: record.id, ...common })
          toast.success('Asset saved.')
        } else {
          const a = await create.mutateAsync({ item: Number(v.item), store: Number(v.store), ...common })
          toast.success(`Registered as ${a.tag}.`)
          navigate(`/inventory/assets/${a.id}`)
        }
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Item" required error={errors.item?.message}>
            {(p) => <Controller control={control} name="item" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={record != null} options={items} placeholder={items.length ? 'Choose…' : 'Add a fixed-asset item first'} />} />}
          </FormField>
          <FormField label="Store" required error={errors.store?.message}>
            {(p) => <Controller control={control} name="store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={record != null} options={stores} />} />}
          </FormField>
          <FormField label="Serial number" error={errors.serial_number?.message}>
            <Input {...register('serial_number')} className="font-mono" />
          </FormField>
          <FormField label="Condition">
            {(p) => <Controller control={control} name="condition" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ConditionEnum')} />} />}
          </FormField>
          <FormField label="Cost" error={errors.cost?.message}>
            <Input {...register('cost')} inputMode="decimal" className="tabular-nums" />
          </FormField>
          <FormField label="Bought on (AD)" error={errors.purchased_on?.message}>
            {(p) => <Controller control={control} name="purchased_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
          <FormField label="Warranty until (AD)" error={errors.warranty_until?.message}>
            {(p) => <Controller control={control} name="warranty_until" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
          <FormField label="Note" error={errors.note?.message}>
            <Input {...register('note')} maxLength={255} />
          </FormField>
        </div>
      )}
    </FormDialog>
  )
}

/** The fixed-asset register: every tagged asset, where it is and who has it. */
export default function AssetsPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status', 'condition', 'store'] })
  const query = useAssets(list.query)
  const { stores } = useInventoryOptions()
  const [creating, setCreating] = useState(false)
  const columns: Column<Asset>[] = [
    { id: 'tag', header: 'Tag', className: 'font-mono text-xs', cell: (a) => a.tag },
    { id: 'item', header: 'Asset', mobile: 'title', cell: (a) => <span className="font-medium">{a.item_name}</span> },
    { id: 'serial', header: 'Serial', mobile: 'hidden', className: 'font-mono text-xs', cell: (a) => a.serial_number || '—' },
    { id: 'where', header: 'Where', cell: (a) => a.holder ?? a.store_name },
    { id: 'condition', header: 'Condition', cell: (a) => enumLabel('ConditionEnum', a.condition) },
    { id: 'status', header: 'Status', cell: (a) => <AssetStatus status={a.status} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Assets"
        columns={columns}
        query={query}
        list={list}
        getRowId={(a) => a.id}
        searchPlaceholder="Tag, serial or item…"
        onRowClick={(a) => navigate(`/inventory/assets/${a.id}`)}
        toolbar={
          <PermissionGate permission={PERMS.inventory.manage}>
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden /> Register asset
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('AssetStatusEnum') },
          { name: 'condition', label: 'Condition', options: enumOptions('ConditionEnum') },
          { name: 'store', label: 'Store', options: stores },
        ]}
        empty={{ title: 'No assets yet', description: 'Assets come from receiving a purchase order, or register one by hand.' }}
      />
      <AssetDialog open={creating} record={null} onOpenChange={setCreating} />
    </>
  )
}

const holderSchema = z
  .object({ to: z.enum(['staff', 'student', 'room', 'department']), staff: z.string(), student: z.custom<Student | null>(), room: z.string(), department: z.string(), assigned_on: z.string(), note: z.string().max(255) })
  .refine((v) => (v.to === 'student' ? v.student != null : v[v.to] !== ''), { path: ['staff'], message: 'Choose who gets it.' })

function AssignDialog({ asset, open, onOpenChange }: { asset: Asset; open: boolean; onOpenChange: (o: boolean) => void }) {
  const assign = useAssignAsset()
  const staff = useStaffOptions()
  const rooms = useRoomOptions(asset.campus)
  const departments = useDepartmentOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={`Assign ${asset.tag}`}
      description="To a staff member (it shows on their profile), a student, a room or a department."
      submitLabel="Assign"
      schema={holderSchema}
      defaultValues={{ to: 'staff' as 'staff' | 'student' | 'room' | 'department', staff: '', student: null, room: '', department: '', assigned_on: todayIso(), note: '' }}
      onSubmit={async (v) => {
        const holder = v.to === 'student' ? { student: v.student!.id } : { [v.to]: Number(v[v.to]) }
        const a = await assign.mutateAsync({ id: asset.id, ...holder, assigned_on: v.assigned_on, note: v.note })
        toast.success(`Assigned to ${a.holder_name}.`)
      }}
    >
      {({ register, control, watch, formState: { errors } }) => {
        const to = watch('to')
        const err = errors.staff?.message
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Give to">
                {(p) => <Controller control={control} name="to" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={[{ value: 'staff', label: 'Staff member' }, { value: 'student', label: 'Student' }, { value: 'room', label: 'Room' }, { value: 'department', label: 'Department' }]} />} />}
              </FormField>
              <FormField label="From (AD)">
                {(p) => <Controller control={control} name="assigned_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
            {to === 'student' ? (
              <FormField label="Student" required error={err}>
                {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
              </FormField>
            ) : (
              <FormField label={to === 'staff' ? 'Staff member' : to === 'room' ? 'Room' : 'Department'} required error={err}>
                {(p) => <Controller control={control} name={to} render={({ field }) => <SelectControl {...p} value={field.value as string} onChange={field.onChange} options={(to === 'staff' ? staff.data : to === 'room' ? rooms.data : departments.data) ?? []} />} />}
              </FormField>
            )}
            <FormField label="Note" error={errors.note?.message}>
              <Input {...register('note')} maxLength={255} />
            </FormField>
          </>
        )
      }}
    </FormDialog>
  )
}

const MAINT_TONE: Record<string, StatusTone> = { scheduled: 'info', in_progress: 'warning', completed: 'success', cancelled: 'muted' }
export function MaintenanceStatus({ status }: { status: Maintenance['status'] }) {
  return <StatusBadge status={status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'open'} tone={MAINT_TONE[status]} label={enumLabel('MaintenanceStatusEnum', status)} />
}

/** One asset: what it is, who has it, its history, and what can be done with it. */
export function AssetDetailPage() {
  const id = Number(useParams().id)
  const asset = useAsset(Number.isFinite(id) ? id : null)
  const history = useAssignments({ ...PICKER_PARAMS, asset: id })
  const jobs = useMaintenance({ ...PICKER_PARAMS, asset: id })
  const { stores, suppliers } = useInventoryOptions()
  const { can } = usePermissions()
  const ret = useReturnAsset()
  const move = useMoveAsset()
  const dispose = useDisposeAsset()
  const schedule = useScheduleMaintenance()
  const [dialog, setDialog] = useState<'edit' | 'assign' | 'return' | 'move' | 'maintain' | 'dispose' | null>(null)
  if (asset.isPending) return <PageLoader />
  if (asset.isError) return <ErrorState error={asset.error} onRetry={() => void asset.refetch()} />
  const a = asset.data
  const manage = can(PERMS.inventory.manage) && a.status !== 'disposed'
  const close = (o: boolean) => !o && setDialog(null)
  return (
    <div>
      <PageHeader
        backTo="/inventory/assets"
        title={`${a.item_name} · ${a.tag}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {a.holder ? `With ${a.holder}` : `In ${a.store_name}`} · {enumLabel('ConditionEnum', a.condition)}
            <AssetStatus status={a.status} />
          </span>
        }
        actions={
          manage && (
            <>
              {a.status === 'in_store' && (
                <Button onClick={() => setDialog('assign')}>
                  <UserPlus aria-hidden /> Assign
                </Button>
              )}
              {a.status === 'assigned' && (
                <Button onClick={() => setDialog('return')}>
                  <Undo2 aria-hidden /> Take back
                </Button>
              )}
              {a.status === 'in_store' && (
                <Button variant="outline" onClick={() => setDialog('move')}>
                  <ArrowRightLeft aria-hidden /> Move
                </Button>
              )}
              {a.status !== 'maintenance' && (
                <Button variant="outline" onClick={() => setDialog('maintain')}>
                  <Wrench aria-hidden /> Maintenance
                </Button>
              )}
              <Button variant="outline" onClick={() => setDialog('edit')}>
                <Pencil aria-hidden /> Edit
              </Button>
              {a.status === 'in_store' && (
                <Button variant="outline" onClick={() => setDialog('dispose')}>
                  <Ban aria-hidden /> Dispose
                </Button>
              )}
            </>
          )
        }
      />
      <dl className="mb-6 grid gap-3 rounded-lg border bg-card p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Serial</dt>
          <dd className="font-mono">{a.serial_number || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cost</dt>
          <dd>{a.cost ? <Money value={a.cost} /> : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Bought</dt>
          <dd className="tabular-nums">{formatDate(a.purchased_on)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Warranty until</dt>
          <dd className="tabular-nums">{formatDate(a.warranty_until)}</dd>
        </div>
        {a.note && <p className="text-muted-foreground sm:col-span-4">{a.note}</p>}
      </dl>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title="Who has had it" />
          {(history.data?.results ?? []).length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Never assigned.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {history.data!.results.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                  <span className="flex-1 font-medium">{h.holder_name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatDate(h.assigned_on)} – {h.returned_on ? formatDate(h.returned_on) : 'now'}
                  </span>
                  {h.returned_condition && <span className="text-xs text-muted-foreground">came back {enumLabel('ConditionEnum', h.returned_condition).toLowerCase()}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <SectionHeader title="Maintenance" />
          {(jobs.data?.results ?? []).length === 0 ? (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">None yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {jobs.data!.results.map((j) => (
                <li key={j.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                  <span className="flex-1">
                    <span className="font-medium">{enumLabel('AssetMaintenanceKindEnum', j.kind)}</span> · {j.description}
                  </span>
                  <MaintenanceStatus status={j.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <AssetDialog open={dialog === 'edit'} record={a} onOpenChange={close} />
      <AssignDialog asset={a} open={dialog === 'assign'} onOpenChange={close} />
      <FormDialog
        open={dialog === 'return'}
        onOpenChange={close}
        title={`Take ${a.tag} back from ${a.holder}?`}
        submitLabel="Take back"
        schema={z.object({ condition: z.string(), note: z.string().max(255) })}
        defaultValues={{ condition: a.condition ?? '', note: '' }}
        onSubmit={async (v) => {
          await ret.mutateAsync({ id: a.id, condition: v.condition as AssetCondition, note: v.note })
          toast.success('Back in store.')
        }}
      >
        {({ register, control }) => (
          <>
            <FormField label="Condition it came back in">
              {(p) => <Controller control={control} name="condition" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ConditionEnum')} />} />}
            </FormField>
            <FormField label="Note">
              <Input {...register('note')} maxLength={255} />
            </FormField>
          </>
        )}
      </FormDialog>
      <FormDialog
        open={dialog === 'move'}
        onOpenChange={close}
        title={`Move ${a.tag} to another store`}
        submitLabel="Move"
        schema={z.object({ store: z.string().min(1, 'Choose a store.'), note: z.string().max(255) }).refine((v) => v.store !== String(a.store), { path: ['store'], message: 'It’s already there.' })}
        defaultValues={{ store: '', note: '' }}
        onSubmit={async (v) => {
          await move.mutateAsync({ id: a.id, store: Number(v.store), note: v.note })
          toast.success('Moved.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label="To store" required error={errors.store?.message}>
              {(p) => <Controller control={control} name="store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label="Note">
              <Input {...register('note')} maxLength={255} />
            </FormField>
          </>
        )}
      </FormDialog>
      <FormDialog
        open={dialog === 'maintain'}
        onOpenChange={close}
        title={`Maintenance for ${a.tag}`}
        description="Scheduled now; start it when the work begins (the asset is then under maintenance)."
        submitLabel="Schedule"
        schema={z.object({ kind: z.string(), description: z.string().trim().min(1, 'Describe the work.').max(255), supplier: z.string(), scheduled_on: optionalIsoDate })}
        defaultValues={{ kind: 'repair', description: '', supplier: '', scheduled_on: '' }}
        onSubmit={async (v) => {
          await schedule.mutateAsync({ asset: a.id, kind: v.kind as Maintenance['kind'], description: v.description, supplier: v.supplier ? Number(v.supplier) : null, scheduled_on: v.scheduled_on || null })
          toast.success('Maintenance scheduled.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Kind">
                {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('AssetMaintenanceKindEnum')} />} />}
              </FormField>
              <FormField label="On (AD)" error={errors.scheduled_on?.message}>
                {(p) => <Controller control={control} name="scheduled_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
            <FormField label="Work" required error={errors.description?.message}>
              <Input {...register('description')} maxLength={255} placeholder="Replace the screen" />
            </FormField>
            <FormField label="Done by">
              {(p) => <Controller control={control} name="supplier" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="In-house" options={suppliers} />} />}
            </FormField>
          </>
        )}
      </FormDialog>
      <FormDialog
        open={dialog === 'dispose'}
        onOpenChange={close}
        title={`Dispose of ${a.tag}?`}
        description="It leaves the register for good. Its history stays."
        submitLabel="Dispose"
        schema={z.object({ method: z.string().min(1), reason: z.string().trim().min(1, 'Say why.').max(255), disposed_on: optionalIsoDate, proceeds: money })}
        defaultValues={{ method: 'scrapped', reason: '', disposed_on: todayIso(), proceeds: '' }}
        onSubmit={async (v) => {
          await dispose.mutateAsync({ id: a.id, method: v.method as Disposal['method'], reason: v.reason, disposed_on: v.disposed_on || undefined, proceeds: v.proceeds || null })
          toast.success('Disposed.')
        }}
      >
        {({ register, control, watch, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="How">
                {(p) => <Controller control={control} name="method" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('DisposalMethodEnum')} />} />}
              </FormField>
              <FormField label="On (AD)" error={errors.disposed_on?.message}>
                {(p) => <Controller control={control} name="disposed_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
            <FormField label="Reason" required error={errors.reason?.message}>
              <Input {...register('reason')} maxLength={255} placeholder="Beyond repair" />
            </FormField>
            {watch('method') === 'sold' && (
              <FormField label="Sold for" error={errors.proceeds?.message}>
                <Input {...register('proceeds')} inputMode="decimal" />
              </FormField>
            )}
          </>
        )}
      </FormDialog>
    </div>
  )
}
