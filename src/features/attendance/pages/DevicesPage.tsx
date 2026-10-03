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

const VIEWS = [
  { value: 'devices', label: 'Devices' },
  { value: 'ids', label: 'Biometric IDs' },
] as const

const ips = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])

/** The API key is only ever shown here, once. */
function KeyDialog({ apiKey, onClose }: { apiKey: string | null; onClose: () => void }) {
  return (
    <Dialog open={apiKey != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Device API key</DialogTitle>
          <DialogDescription>Enter this on the device now. It won’t be shown again; if it’s lost, issue a new one.</DialogDescription>
        </DialogHeader>
        <code className="block break-all rounded-md border bg-muted p-3 font-mono text-sm">{apiKey}</code>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard?.writeText(apiKey ?? '')
              toast.success('Copied.')
            }}
          >
            <Copy aria-hidden /> Copy
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const deviceSchema = z.object({
  campus: z.string().min(1, 'Choose a branch.'),
  name: z.string().trim().min(1, 'Give it a name.').max(100),
  kind: z.string().min(1),
  serial_number: z.string().trim().min(1, 'As printed on the device.').max(64),
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
      title={record ? 'Edit device' : 'Add a device'}
      description="A ZKTeco reader identifies itself by serial number, so limit it to its network address. A generic device gets an API key."
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
          toast.success('Device saved.')
        } else {
          const created = await create.mutateAsync(input)
          toast.success('Device added.')
          if (created.api_key) onKey(created.api_key)
        }
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          {isMultiBranch && (
            <FormField label="Branch" required error={errors.campus?.message}>
              {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} maxLength={100} placeholder="Main gate" />
            </FormField>
            <FormField label="Kind" required error={errors.kind?.message}>
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('DeviceKindEnum')} disabled={record != null} />} />}
            </FormField>
          </div>
          <FormField label="Serial number" required error={errors.serial_number?.message}>
            <Input {...register('serial_number')} maxLength={64} className="font-mono" />
          </FormField>
          <FormField label="Allowed IP addresses" error={errors.allowed_ips?.message} description="Separate with commas. Empty allows any address.">
            <Input {...register('allowed_ips')} className="font-mono" placeholder="203.0.113.7" />
          </FormField>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Accepting check-ins
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
    { id: 'name', header: 'Device', mobile: 'title', cell: (d) => <span className="font-medium">{d.name}</span> },
    { id: 'campus', header: 'Branch', hidden: !isMultiBranch, cell: (d) => branchName(d.campus) },
    { id: 'kind', header: 'Kind', cell: (d) => enumLabel('DeviceKindEnum', d.kind) },
    { id: 'serial', header: 'Serial', className: 'font-mono text-xs', cell: (d) => d.serial_number },
    { id: 'seen', header: 'Last seen', className: 'tabular-nums', cell: (d) => (d.last_seen_at ? formatDateTime(d.last_seen_at) : <span className="text-muted-foreground">Never</span>) },
    { id: 'status', header: 'Status', cell: (d) => <StatusBadge status={d.is_active === false ? 'inactive' : 'active'} label={d.is_active === false ? 'Off' : 'On'} /> },
  ]

  return (
    <>
      <DataTable
        ariaLabel="Attendance devices"
        columns={columns}
        query={query}
        list={list}
        getRowId={(d) => d.id}
        searchable={false}
        toolbar={
          <Button onClick={crud.openCreate}>
            <Plus aria-hidden /> Add device
          </Button>
        }
        filters={[
          { name: 'kind', label: 'Kind', options: enumOptions('DeviceKindEnum') },
          { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'On' }, { value: 'false', label: 'Off' }] },
        ]}
        rowActions={(d) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, onSelect: () => crud.openEdit(d) },
              { label: 'Issue a new API key', icon: KeyRound, hidden: d.kind !== 'generic', onSelect: () => setRotating(d) },
              { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => crud.openDelete(d) },
            ]}
          />
        )}
        empty={{ title: 'No devices yet', description: 'Add the biometric readers at your gates so staff check-ins arrive on their own.' }}
      />
      <DeviceDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} onKey={setApiKey} />
      <ConfirmDialog
        open={rotating != null}
        onOpenChange={(o) => !o && setRotating(null)}
        title="Issue a new API key?"
        description="The old key stops working at once. Enter the new one on the device."
        confirmLabel="Issue key"
        onConfirm={async () => {
          const r = await rotate.mutateAsync(rotating!.id)
          setApiKey(r.api_key)
        }}
      />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`the device “${crud.deleting.name}”`}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Device deleted.')
          }}
        />
      )}
      <KeyDialog apiKey={apiKey} onClose={() => setApiKey(null)} />
    </>
  )
}

const idSchema = z
  .object({
    pin: z.string().trim().min(1, 'The user number on the device.').max(32),
    who: z.enum(['staff', 'student']),
    staff: z.string(),
    student: z.custom<Student | null>(),
  })
  .refine((v) => (v.who === 'staff' ? v.staff !== '' : v.student != null), { path: ['staff'], message: 'Choose who this is.' })

function IdentityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const create = useCreateBiometricId()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Map a device PIN"
      description="Who a user number enrolled on the devices is. Check-ins the PIN already sent are applied straight away."
      submitLabel="Map PIN"
      schema={idSchema}
      defaultValues={{ pin: '', who: 'staff', staff: '', student: null }}
      onSubmit={async (v) => {
        await create.mutateAsync(v.who === 'staff' ? { pin: v.pin, staff: Number(v.staff), student: null } : { pin: v.pin, staff: null, student: v.student!.id })
        toast.success('PIN mapped.')
      }}
    >
      {({ control, register, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="PIN" required error={errors.pin?.message}>
              <Input {...register('pin')} maxLength={32} className="font-mono" inputMode="numeric" />
            </FormField>
            <FormField label="Person is" required>
              {(p) => <Controller control={control} name="who" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={[{ value: 'staff', label: 'Staff member' }, { value: 'student', label: 'Student' }]} />} />}
            </FormField>
          </div>
          {watch('who') === 'staff' ? (
            <FormField label="Staff member" required error={errors.staff?.message}>
              {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} />} />}
            </FormField>
          ) : (
            <FormField label="Student" required error={errors.staff?.message ?? errors.student?.message}>
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
    { id: 'who', header: 'Person', mobile: 'title', cell: (b) => <span className="font-medium">{b.person_name}</span> },
    { id: 'kind', header: 'Is', cell: (b) => (b.staff != null ? 'Staff' : 'Student') },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Biometric IDs"
        columns={columns}
        query={query}
        list={list}
        getRowId={(b) => b.id}
        searchPlaceholder="Exact PIN…"
        toolbar={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Map a PIN
          </Button>
        }
        rowActions={(b) => <RowActions actions={[{ label: 'Remove', icon: Trash2, destructive: true, onSelect: () => setDeleting(b) }]} />}
        empty={{ title: 'No PINs mapped', description: 'Check-ins from an unmapped PIN are kept, and applied once you map it.' }}
      />
      <IdentityDialog open={adding} onOpenChange={setAdding} />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        subject={deleting ? `PIN ${deleting.pin}` : 'this PIN'}
        confirmLabel="Remove"
        description="Future check-ins from this PIN won’t be linked to anyone. Past ones stay."
        onConfirm={async () => {
          await remove.mutateAsync(deleting!.id)
          toast.success('Removed.')
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
      <div className="mb-4 inline-flex rounded-md border p-0.5" role="tablist" aria-label="Devices">
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
