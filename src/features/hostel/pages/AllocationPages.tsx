import { ArrowRightLeft, BedDouble, Files, LogIn, LogOut, XCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { Controller } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTerms } from '@/features/academics/terms/hooks/useTerms'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { isoDate, optionalIsoDate } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Allocation, Bed } from '../api/hostel.api'
import { useAllocate, useAllocations, useBeds, useBuildingOptions, useCancelAllocation, useCheckIn, useCheckOut, useHostelInvoices, useMoveAllocation, useRooms } from '../hooks/useHostel'

const TONE: Record<string, StatusTone> = { reserved: 'warning', checked_in: 'success', checked_out: 'muted', cancelled: 'muted' }
export function AllocationStatus({ status }: { status: Allocation['status'] }) {
  return <StatusBadge status={status === 'checked_in' ? 'active' : status === 'reserved' ? 'pending' : status === 'cancelled' ? 'cancelled' : 'closed'} tone={TONE[status]} label={enumLabel('AllocationStatusEnum', status).split(' (')[0]!} />
}

const allocateSchema = z
  .object({ who: z.enum(['student', 'staff']), student: z.custom<Student | null>(), staff: z.string(), start_date: isoDate, note: z.string().max(255) })
  .refine((v) => (v.who === 'student' ? v.student != null : v.staff !== ''), { path: ['staff'], message: 'Choose who gets the bed.' })

function AllocateDialog({ bed, onClose }: { bed: Bed | null; onClose: () => void }) {
  const allocate = useAllocate()
  const staff = useStaffOptions()
  return (
    <FormDialog
      open={bed != null}
      onOpenChange={(o) => !o && onClose()}
      wide
      title={bed ? `Reserve ${bed.room_label}, bed ${bed.label}` : 'Reserve a bed'}
      description="The bed is held from the start date; check them in when they arrive."
      submitLabel="Reserve"
      schema={allocateSchema}
      defaultValues={{ who: 'student' as 'student' | 'staff', student: null, staff: '', start_date: todayIso(), note: '' }}
      onSubmit={async (v) => {
        const a = await allocate.mutateAsync({ bed: bed!.id, ...(v.who === 'student' ? { student: v.student!.id } : { staff: Number(v.staff) }), start_date: v.start_date, note: v.note })
        toast.success(`Reserved for ${a.occupant_name}.`)
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="For">
              {(p) => <Controller control={control} name="who" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={[{ value: 'student', label: 'A student' }, { value: 'staff', label: 'A staff member' }]} />} />}
            </FormField>
            <FormField label="From (AD)" required error={errors.start_date?.message}>
              {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
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
          <FormField label="Note">
            <Input {...register('note')} maxLength={255} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

function BillTermDialog({ open, onOpenChange, building }: { open: boolean; onOpenChange: (o: boolean) => void; building: string }) {
  const bill = useHostelInvoices()
  const terms = useTerms({ ...PICKER_PARAMS, ordering: '-start_date' })
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Bill a term’s hostel fees"
      description="One invoice per student resident, at their room type’s fee. Students already billed for the term are skipped, so it’s safe to run again."
      submitLabel="Generate invoices"
      schema={z.object({ term: z.string().min(1, 'Choose a term.'), due_date: optionalIsoDate })}
      defaultValues={{ term: '', due_date: '' }}
      onSubmit={async (v) => {
        const r = await bill.mutateAsync({ term: Number(v.term), ...(building ? { building: Number(building) } : {}), ...(v.due_date ? { due_date: v.due_date } : {}) })
        const notes = [r.skipped && `${r.skipped} already billed`, r.not_enrolled && `${r.not_enrolled} not enrolled that term`, r.room_types_without_fee_category.length && `no fee category on ${r.room_types_without_fee_category.join(', ')}`].filter(Boolean)
        toast.success(`${r.created} invoice${r.created === 1 ? '' : 's'} generated${notes.length ? ` (${notes.join('; ')})` : ''}.`)
      }}
    >
      {({ control, formState: { errors } }) => (
        <>
          <FormField label="Term" required error={errors.term?.message}>
            {(p) => <Controller control={control} name="term" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(terms.data?.results ?? []).map((t) => ({ value: String(t.id), label: t.name }))} />} />}
          </FormField>
          <FormField label="Due date (AD)" error={errors.due_date?.message}>
            {(p) => <Controller control={control} name="due_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** The bed board: every room in a building, each bed free, reserved or occupied. Click a free bed to reserve it. */
export function BoardPage() {
  const [params, setParams] = useSearchParams()
  const buildings = useBuildingOptions()
  const building = params.get('building') ?? buildings[0]?.value ?? ''
  const rooms = useRooms({ ...PICKER_PARAMS, building: building || undefined, is_active: true }, { enabled: Boolean(building) })
  const beds = useBeds({ ...PICKER_PARAMS, room__building: building || undefined }, { enabled: Boolean(building) })
  const { can } = usePermissions()
  const manage = can(PERMS.hostel.manage)
  const [allocating, setAllocating] = useState<Bed | null>(null)
  const [billing, setBilling] = useState(false)
  const bid = useId()
  const all = beds.data?.results ?? []
  const free = all.filter((b) => b.is_active !== false && !b.occupant).length
  const reserved = all.filter((b) => b.occupant?.status === 'reserved').length
  const occupied = all.filter((b) => b.occupant?.status === 'checked_in').length

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 gap-1.5">
          <Label htmlFor={bid}>Building</Label>
          <SelectControl id={bid} value={building} onChange={(v) => setParams({ building: v }, { replace: true })} options={buildings} placeholder={buildings.length ? 'Choose…' : 'Add a building first'} />
        </div>
        {all.length > 0 && (
          <p className="text-sm">
            <span className="font-medium text-success">{free} free</span> · <span className="font-medium text-warning">{reserved} reserved</span> · <span className="font-medium">{occupied} occupied</span>
          </p>
        )}
        <PermissionGate permission={{ all: [PERMS.hostel.manage, PERMS.finance.manage] }}>
          <Button variant="outline" className="ml-auto" onClick={() => setBilling(true)}>
            <Files aria-hidden /> Bill a term
          </Button>
        </PermissionGate>
      </div>
      {!building ? (
        <EmptyState title="No buildings yet" description="Set up buildings, floors, room types and rooms first." icon={BedDouble} />
      ) : rooms.isPending || beds.isPending ? (
        <TableSkeleton rows={4} columns={4} />
      ) : rooms.isError ? (
        <ErrorState error={rooms.error} onRetry={() => void rooms.refetch()} />
      ) : rooms.data.results.length === 0 ? (
        <EmptyState title="No rooms in this building" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.data.results.map((r) => (
            <section key={r.id} className="rounded-lg border bg-card p-3">
              <h3 className="mb-2 flex items-baseline justify-between text-sm">
                <span className="font-semibold">Room {r.number}</span>
                <span className="text-xs text-muted-foreground">{r.room_type_name}</span>
              </h3>
              <ul className="grid gap-1.5">
                {all
                  .filter((b) => b.room === r.id)
                  .map((b) => {
                    const state = b.is_active === false ? 'off' : b.occupant?.status ?? 'free'
                    const cls = { free: 'border-success/30 bg-success-soft hover:bg-success/15', reserved: 'border-warning/30 bg-warning-soft', checked_in: 'border-border bg-muted', off: 'border-dashed opacity-50' }[state]
                    const body = (
                      <>
                        <span className="w-6 font-semibold">{b.label}</span>
                        <span className="min-w-0 flex-1 truncate">{b.occupant ? b.occupant.name : state === 'off' ? 'Not in use' : 'Free'}</span>
                        {b.occupant && <span className="text-[11px] text-muted-foreground">{b.occupant.status === 'reserved' ? 'reserved' : 'in'}</span>}
                      </>
                    )
                    return (
                      <li key={b.id}>
                        {state === 'free' && manage ? (
                          <button type="button" onClick={() => setAllocating(b)} className={cn('flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm', cls)} aria-label={`Reserve room ${r.number} bed ${b.label}`}>
                            {body}
                          </button>
                        ) : (
                          <div className={cn('flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm', cls)}>{body}</div>
                        )}
                      </li>
                    )
                  })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <AllocateDialog bed={allocating} onClose={() => setAllocating(null)} />
      <BillTermDialog open={billing} onOpenChange={setBilling} building={building} />
    </>
  )
}

function MoveDialog({ allocation, onClose }: { allocation: Allocation | null; onClose: () => void }) {
  const move = useMoveAllocation()
  const beds = useBeds({ ...PICKER_PARAMS }, { enabled: allocation != null })
  const freeBeds = (beds.data?.results ?? []).filter((b) => !b.occupant && b.is_active !== false)
  return (
    <FormDialog
      open={allocation != null}
      onOpenChange={(o) => !o && onClose()}
      title={allocation ? `Move ${allocation.occupant_name}` : 'Move'}
      description="Ends this stay and starts a new one in the other bed, keeping the history."
      submitLabel="Move"
      schema={z.object({ bed: z.string().min(1, 'Choose a free bed.'), on: optionalIsoDate, note: z.string().max(255) })}
      defaultValues={{ bed: '', on: todayIso(), note: '' }}
      onSubmit={async (v) => {
        const a = await move.mutateAsync({ id: allocation!.id, bed: Number(v.bed), ...(v.on ? { on: v.on } : {}), note: v.note })
        toast.success(`Moved to ${a.building_name} ${a.room_number}, bed ${a.bed_label}.`)
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label="To bed" required error={errors.bed?.message}>
            {(p) => <Controller control={control} name="bed" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={freeBeds.map((b) => ({ value: String(b.id), label: `${b.room_label} · bed ${b.label}` }))} placeholder={freeBeds.length ? 'Choose…' : 'No free bed'} />} />}
          </FormField>
          <FormField label="On (AD)" error={errors.on?.message}>
            {(p) => <Controller control={control} name="on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
          <FormField label="Note">
            <Input {...register('note')} maxLength={255} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** Every stay: reserved, checked in, out or cancelled. */
export function AllocationsPage() {
  const list = useListState({ filters: ['status', 'bed__room__building'] })
  const query = useAllocations(list.query)
  const buildings = useBuildingOptions()
  const checkIn = useCheckIn()
  const checkOut = useCheckOut()
  const cancel = useCancelAllocation()
  const [acting, setActing] = useState<{ kind: 'in' | 'out' | 'cancel' | 'move'; a: Allocation } | null>(null)
  const columns: Column<Allocation>[] = [
    { id: 'who', header: 'Resident', mobile: 'title', cell: (a) => <span className="font-medium">{a.occupant_name}</span> },
    { id: 'bed', header: 'Bed', cell: (a) => `${a.building_name} ${a.room_number} · ${a.bed_label}` },
    { id: 'from', header: 'From', className: 'tabular-nums', cell: (a) => formatDate(a.start_date) },
    { id: 'to', header: 'Until', className: 'tabular-nums', cell: (a) => formatDate(a.end_date) },
    { id: 'status', header: 'Status', cell: (a) => <AllocationStatus status={a.status} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Allocations"
        columns={columns}
        query={query}
        list={list}
        getRowId={(a) => a.id}
        searchPlaceholder="Resident name or number…"
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('AllocationStatusEnum').map((o) => ({ ...o, label: o.label.split(' (')[0]! })) },
          { name: 'bed__room__building', label: 'Building', options: buildings },
        ]}
        rowActions={(a) => (
          <RowActions
            actions={[
              { label: 'Check in', icon: LogIn, permission: PERMS.hostel.manage, hidden: a.status !== 'reserved', onSelect: () => setActing({ kind: 'in', a }) },
              // A move must fall after the stay began, so not on its first day.
              { label: 'Move', icon: ArrowRightLeft, permission: PERMS.hostel.manage, hidden: a.status !== 'checked_in' || a.start_date >= todayIso(), onSelect: () => setActing({ kind: 'move', a }) },
              { label: 'Check out', icon: LogOut, permission: PERMS.hostel.manage, hidden: a.status !== 'checked_in', onSelect: () => setActing({ kind: 'out', a }) },
              { label: 'Cancel reservation', icon: XCircle, permission: PERMS.hostel.manage, hidden: a.status !== 'reserved', destructive: true, onSelect: () => setActing({ kind: 'cancel', a }) },
            ]}
          />
        )}
        empty={{ title: 'No allocations yet', description: 'Reserve a bed from the bed board.' }}
      />
      <ConfirmDialog
        open={acting?.kind === 'in'}
        onOpenChange={(o) => !o && setActing(null)}
        title={acting ? `Check ${acting.a.occupant_name} in?` : ''}
        description="Allowed on or after the reserved start date."
        confirmLabel="Check in"
        onConfirm={async () => {
          await checkIn.mutateAsync(acting!.a.id)
          toast.success('Checked in.')
        }}
      />
      <FormDialog
        open={acting?.kind === 'out'}
        onOpenChange={(o) => !o && setActing(null)}
        title={acting ? `Check ${acting.a.occupant_name} out?` : ''}
        description="The bed is free again."
        submitLabel="Check out"
        schema={z.object({ on: optionalIsoDate, note: z.string().max(255) })}
        defaultValues={{ on: todayIso(), note: '' }}
        onSubmit={async (v) => {
          await checkOut.mutateAsync({ id: acting!.a.id, ...(v.on ? { on: v.on } : {}), note: v.note })
          toast.success('Checked out.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label="On (AD)" error={errors.on?.message}>
              {(p) => <Controller control={control} name="on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label="Note">
              <Input {...register('note')} maxLength={255} placeholder="Room left in good order" />
            </FormField>
          </>
        )}
      </FormDialog>
      <FormDialog
        open={acting?.kind === 'cancel'}
        onOpenChange={(o) => !o && setActing(null)}
        title="Cancel this reservation?"
        submitLabel="Cancel reservation"
        schema={z.object({ reason: z.string().trim().min(1, 'Say why.').max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await cancel.mutateAsync({ id: acting!.a.id, reason: v.reason })
          toast.success('Reservation cancelled.')
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label="Reason" required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} />
          </FormField>
        )}
      </FormDialog>
      <MoveDialog allocation={acting?.kind === 'move' ? acting.a : null} onClose={() => setActing(null)} />
    </>
  )
}
