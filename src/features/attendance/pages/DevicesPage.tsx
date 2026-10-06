import { Copy, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { BiometricIdentity, Device } from '../api/attendance.api'
import { useBiometricIds, useCreateBiometricId, useCreateDevice, useDevices, useRemoveBiometricId, useRemoveDevice, useRotateDeviceKey, useUpdateDevice } from '../hooks/useAttendance'
import { tr } from '@/lib/i18n'

const VIEWS = [
  { value: 'devices', label: tr('Devices') },
  { value: 'ids', label: tr('Biometric IDs') },
] as const

const ips = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])

/** The API key is only ever shown here, once. */
function KeyDialog({ apiKey, onClose }: { apiKey: string | null; onClose: () => void }) {
  return (
    <Dialog open={apiKey != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tr('Device API key')}</DialogTitle>
          <DialogDescription>{tr('Enter this on the device now. It won’t be shown again; if it’s lost, issue a new one.')}</DialogDescription>
        </DialogHeader>
        <code className="block break-all rounded-md border bg-muted p-3 font-mono text-sm">{apiKey}</code>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard?.writeText(apiKey ?? '')
              toast.success(tr('Copied.'))
            }}
          >
            <Copy aria-hidden /> {tr('Copy')}
          </Button>
          <Button onClick={onClose}>{tr('Done')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const deviceSchema = z.object({
  campus: z.string().min(1, tr('Choose a branch.')),
  name: z.string().trim().min(1, tr('Give it a name.')).max(100),
  kind: z.string().min(1),
  serial_number: z.string().trim().min(1, tr('As printed on the device.')).max(64),
  allowed_ips: z.string(),
  is_active: z.boolean(),
})

function DeviceDialog({ open, record, onOpenChange, onKey }: { open: boolean; record: Device | null; onOpenChange: (o: boolean) => void; onKey: (k: string) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const create = useCreateDevice()
  const update = useUpdateDevice()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit device') : tr('Add a device')}
      description={tr('A ZKTeco reader identifies itself by serial number, so limit it to its network address. A generic device gets an API key.')}
      schema={deviceSchema}
      defaultValues={{
        campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''),
        name: record?.name ?? '',
        kind: record?.kind ?? 'zkteco',
        serial_number: record?.serial_number ?? '',
        allowed_ips: ips(record?.allowed_ips).join(', '),
        is_active: record?.is_active ?? true,
      }}
      onSubmit={async (v) => {
        const input = {
          ...v,
          campus: Number(v.campus),
          kind: v.kind as Device['kind'],
          allowed_ips: v.allowed_ips
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        }
        if (record) {
          await update.mutateAsync({ id: record.id, input })
          toast.success(tr('Device saved.'))
        } else {
          const created = await create.mutateAsync(input)
          toast.success(tr('Device added.'))
          if (created.api_key) onKey(created.api_key)
        }
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          {isMultiBranch && (
            <FormField label={tr('Branch')} required error={errors.campus?.message}>
              {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} maxLength={100} placeholder={tr('Main gate')} />
            </FormField>
            <FormField label={tr('Kind')} required error={errors.kind?.message}>
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('DeviceKindEnum')} disabled={record != null} />} />}
            </FormField>
          </div>
          <FormField label={tr('Serial number')} required error={errors.serial_number?.message}>
            <Input {...register('serial_number')} maxLength={64} className="font-mono" />
          </FormField>
          <FormField label={tr('Allowed IP addresses')} error={errors.allowed_ips?.message} description={tr('Separate with commas. Empty allows any address.')}>
            <Input {...register('allowed_ips')} className="font-mono" placeholder="203.0.113.7" />
          </FormField>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Accepting check-ins')}
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

function Devices() {
  const { isMultiBranch, branchName, selectedBranchId } = useBranches()
  const list = useListState({ filters: ['kind', 'is_active'] })
  const query = useDevices({ ...list.query, campus: selectedBranchId ?? undefined })
  const crud = useCrudState<Device>()
  const remove = useRemoveDevice()
  const rotate = useRotateDeviceKey()
  const [rotating, setRotating] = useState<Device | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)

  const columns: Column<Device>[] = [
    { id: 'name', header: tr('Device'), mobile: 'title', cell: (d) => <span className="font-medium">{d.name}</span> },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (d) => branchName(d.campus) },
    { id: 'kind', header: tr('Kind'), cell: (d) => enumLabel('DeviceKindEnum', d.kind) },
    { id: 'serial', header: tr('Serial'), className: 'font-mono text-xs', cell: (d) => d.serial_number },
    { id: 'seen', header: tr('Last seen'), className: 'tabular-nums', cell: (d) => (d.last_seen_at ? formatDateTime(d.last_seen_at) : <span className="text-muted-foreground">{tr('Never')}</span>) },
    { id: 'status', header: tr('Status'), cell: (d) => <StatusBadge status={d.is_active === false ? 'inactive' : 'active'} label={d.is_active === false ? tr('Off') : tr('On')} /> },
  ]

  return (
    <>
      <DataTable
        ariaLabel={tr('Attendance devices')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(d) => d.id}
        searchable={false}
        create={
          <Button onClick={crud.openCreate}>
            <Plus aria-hidden /> {tr('Add device')}
          </Button>
        }
        filters={[
          { name: 'kind', label: tr('Kind'), options: enumOptions('DeviceKindEnum') },
          { name: 'is_active', label: tr('Status'), options: [{ value: 'true', label: tr('On') }, { value: 'false', label: tr('Off') }] },
        ]}
        rowActions={(d) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, onSelect: () => crud.openEdit(d) },
              { label: tr('Issue a new API key'), icon: KeyRound, hidden: d.kind !== 'generic', onSelect: () => setRotating(d) },
              { label: tr('Delete'), icon: Trash2, destructive: true, onSelect: () => crud.openDelete(d) },
            ]}
          />
        )}
        empty={{ title: tr('No devices yet'), description: tr('Add the biometric readers at your gates so staff check-ins arrive on their own.') }}
      />
      <DeviceDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} onKey={setApiKey} />
      <ConfirmDialog
        open={rotating != null}
        onOpenChange={(o) => !o && setRotating(null)}
        title={tr('Issue a new API key?')}
        description={tr('The old key stops working at once. Enter the new one on the device.')}
        confirmLabel={tr('Issue key')}
        onConfirm={async () => {
          const r = await rotate.mutateAsync(rotating!.id)
          setApiKey(r.api_key)
        }}
      />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={tr('the device “{name}”', { name: crud.deleting.name })}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Device deleted.'))
          }}
        />
      )}
      <KeyDialog apiKey={apiKey} onClose={() => setApiKey(null)} />
    </>
  )
}

const idSchema = z
  .object({
    pin: z.string().trim().min(1, tr('The user number on the device.')).max(32),
    who: z.enum(['staff', 'student']),
    staff: z.string(),
    student: z.custom<Student | null>(),
  })
  .refine((v) => (v.who === 'staff' ? v.staff !== '' : v.student != null), { path: ['staff'], message: tr('Choose who this is.') })

function IdentityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const create = useCreateBiometricId()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Map a device PIN')}
      description={tr('Who a user number enrolled on the devices is. Check-ins the PIN already sent are applied straight away.')}
      submitLabel={tr('Map PIN')}
      schema={idSchema}
      defaultValues={{ pin: '', who: 'staff', staff: '', student: null }}
      onSubmit={async (v) => {
        await create.mutateAsync(v.who === 'staff' ? { pin: v.pin, staff: Number(v.staff), student: null } : { pin: v.pin, staff: null, student: v.student!.id })
        toast.success(tr('PIN mapped.'))
      }}
    >
      {({ control, register, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="PIN" required error={errors.pin?.message}>
              <Input {...register('pin')} maxLength={32} className="font-mono" inputMode="numeric" />
            </FormField>
            <FormField label={tr('Person is')} required>
              {(p) => <Controller control={control} name="who" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={[{ value: 'staff', label: tr('Staff member') }, { value: 'student', label: tr('Student') }]} />} />}
            </FormField>
          </div>
          {watch('who') === 'staff' ? (
            <FormField label={tr('Staff member')} required error={errors.staff?.message}>
              {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} />} />}
            </FormField>
          ) : (
            <FormField label={tr('Student')} required error={errors.staff?.message ?? errors.student?.message}>
              {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
            </FormField>
          )}
        </>
      )}
    </FormDialog>
  )
}

function Identities() {
  const list = useListState({ filters: [] })
  const query = useBiometricIds({ ...list.query, pin: list.search || undefined, search: undefined })
  const remove = useRemoveBiometricId()
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<BiometricIdentity | null>(null)
  const columns: Column<BiometricIdentity>[] = [
    { id: 'pin', header: 'PIN', className: 'font-mono', cell: (b) => b.pin },
    { id: 'who', header: tr('Person'), mobile: 'title', cell: (b) => <span className="font-medium">{b.person_name}</span> },
    { id: 'kind', header: tr('Is'), cell: (b) => (b.staff != null ? tr('Staff') : tr('Student')) },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Biometric IDs')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(b) => b.id}
        searchPlaceholder={tr('Exact PIN…')}
        create={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden /> {tr('Map a PIN')}
          </Button>
        }
        rowActions={(b) => <RowActions actions={[{ label: tr('Remove'), icon: Trash2, destructive: true, onSelect: () => setDeleting(b) }]} />}
        empty={{ title: tr('No PINs mapped'), description: tr('Check-ins from an unmapped PIN are kept, and applied once you map it.') }}
      />
      <IdentityDialog open={adding} onOpenChange={setAdding} />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        subject={deleting ? tr('PIN {pin}', { pin: deleting.pin }) : tr('this PIN')}
        confirmLabel={tr('Remove')}
        description={tr('Future check-ins from this PIN won’t be linked to anyone. Past ones stay.')}
        onConfirm={async () => {
          await remove.mutateAsync(deleting!.id)
          toast.success(tr('Removed.'))
        }}
      />
    </>
  )
}

/** Biometric readers and who each device PIN is. Needs attendance.devices (the whole route does). */
export default function DevicesPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'ids' ? 'ids' : 'devices'
  return (
    <>
      <div className="mb-4 inline-flex rounded-md border p-0.5" role="tablist" aria-label={tr('Devices')}>
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={view === v.value}
            onClick={() => setParams(v.value === 'devices' ? {} : { view: v.value }, { replace: true })}
            className={cn('rounded px-3 py-1.5 text-sm', view === v.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === 'devices' ? <Devices /> : <Identities />}
    </>
  )
}
