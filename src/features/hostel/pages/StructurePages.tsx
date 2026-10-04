import { BedDouble, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { SimpleCrudList } from '@/components/common/SimpleCrudList'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Money, moneyInput } from '@/features/finance/components/money'
import { useCategoryOptions } from '@/features/finance/hooks/useFinance'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { useCrudState } from '@/hooks/useCrudState'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { code } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Building, HostelRoom, RoomType } from '../api/hostel.api'
import {
  useBeds,
  useBuildingOptions,
  useBuildings,
  useCreateBed,
  useCreateBuilding,
  useCreateFloor,
  useCreateRoom,
  useCreateRoomType,
  useFloors,
  useRemoveBed,
  useRemoveBuilding,
  useRemoveFloor,
  useRemoveRoom,
  useRemoveRoomType,
  useRoomTypes,
  useRooms,
  useUpdateBuilding,
  useUpdateFloor,
  useUpdateRoom,
  useUpdateRoomType,
} from '../hooks/useHostel'

// ---------------------------------------------------------------------------
// Buildings, floors, room types
// ---------------------------------------------------------------------------
const buildingSchema = z.object({ campus: z.string().min(1, 'Choose a branch.'), code, name: z.string().trim().min(1, 'Required.').max(100), gender: z.string(), warden: z.string(), is_active: z.boolean() })

function BuildingDialog({ open, record, onOpenChange }: { open: boolean; record: Building | null; onOpenChange: (o: boolean) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const staff = useStaffOptions()
  const create = useCreateBuilding()
  const update = useUpdateBuilding()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? 'Edit building' : 'Add building'}
      schema={buildingSchema}
      defaultValues={{ campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''), code: record?.code ?? '', name: record?.name ?? '', gender: record?.gender ?? 'mixed', warden: record?.warden ? String(record.warden) : '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        const input = { ...v, campus: Number(v.campus), gender: v.gender as Building['gender'] & string, warden: v.warden ? Number(v.warden) : null }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Building saved.' : 'Building added. Add its floors next.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} placeholder="girls-a" />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Girls’ Hostel A" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {isMultiBranch && (
              <FormField label="Branch" required error={errors.campus?.message}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
            <FormField label="For">
              {(p) => <Controller control={control} name="gender" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('BuildingGenderEnum')} />} />}
            </FormField>
            <FormField label="Warden">
              {(p) => <Controller control={control} name="warden" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="None" options={staff.data ?? []} />} />}
            </FormField>
          </div>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> In use
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

function Floors({ building }: { building: Building }) {
  return (
    <SimpleCrudList
      permission={PERMS.hostel.manage}
      title={`Floors of ${building.name}`}
      noun="floor"
      fields={[{ name: 'number', label: 'Number (0 = ground)', required: true }, { name: 'name', label: 'Name' }]}
      query={useFloors({ ...PICKER_PARAMS, building: building.id })}
      create={useCreateFloor() as never}
      update={useUpdateFloor() as never}
      remove={useRemoveFloor()}
      label={(r) => `${r.number === 0 ? 'Ground' : `Floor ${r.number}`}${r.name ? ` · ${r.name}` : ''}`}
      extra={{ building: building.id }}
    />
  )
}

const typeSchema = z.object({ code, name: z.string().trim().min(1, 'Required.').max(100), fee_per_term: z.union([z.literal(''), moneyInput]), fee_category: z.string(), description: z.string(), is_active: z.boolean() })

function RoomTypeDialog({ open, record, onOpenChange }: { open: boolean; record: RoomType | null; onOpenChange: (o: boolean) => void }) {
  const { can } = usePermissions()
  const categories = useCategoryOptions()
  const create = useCreateRoomType()
  const update = useUpdateRoomType()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? 'Edit room type' : 'Add room type'}
      description="What a bed in this kind of room costs per term. Hostel invoices are billed under the fee category."
      schema={typeSchema}
      defaultValues={{ code: record?.code ?? '', name: record?.name ?? '', fee_per_term: record?.fee_per_term ?? '', fee_category: record?.fee_category ? String(record.fee_category) : '', description: record?.description ?? '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        const input = { ...v, fee_per_term: v.fee_per_term || '0', fee_category: v.fee_category ? Number(v.fee_category) : null }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Room type saved.' : 'Room type added.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} placeholder="triple" />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Triple sharing" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Fee per term" error={errors.fee_per_term?.message}>
              <Input {...register('fee_per_term')} inputMode="decimal" className="tabular-nums" />
            </FormField>
            {can(PERMS.finance.view) && (
              <FormField label="Fee category">
                {(p) => <Controller control={control} name="fee_category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="None (not billed)" options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />} />}
              </FormField>
            )}
          </div>
          <FormField label="Description">
            <Input {...register('description')} />
          </FormField>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> In use
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

/** Buildings and their floors, and the kinds of room with their fees. */
export function BuildingsPage() {
  const buildings = useBuildings({ ...PICKER_PARAMS })
  const types = useRoomTypes({ ...PICKER_PARAMS })
  const removeBuilding = useRemoveBuilding()
  const removeType = useRemoveRoomType()
  const b = useCrudState<Building>()
  const t = useCrudState<RoomType>()
  const [floorsOf, setFloorsOf] = useState<Building | null>(null)
  return (
    <div className="grid gap-8">
      <section>
        <SectionHeader
          title="Buildings"
          action={
            <PermissionGate permission={PERMS.hostel.manage}>
              <Button onClick={b.openCreate}>
                <Plus aria-hidden /> Add building
              </Button>
            </PermissionGate>
          }
        />
        {buildings.isPending ? (
          <TableSkeleton rows={2} columns={3} />
        ) : buildings.isError ? (
          <ErrorState error={buildings.error} onRetry={() => void buildings.refetch()} />
        ) : buildings.data.results.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No buildings yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.data.results.map((x) => (
              <li key={x.id} className="flex items-start gap-2 rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{x.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {enumLabel('BuildingGenderEnum', x.gender)}
                    {x.warden_name ? ` · warden ${x.warden_name}` : ''}
                  </p>
                  <button type="button" className="mt-1 text-xs underline" onClick={() => setFloorsOf(x)}>
                    Floors
                  </button>
                </div>
                {x.is_active === false && <StatusBadge status="inactive" label="Closed" />}
                <RowActions
                  actions={[
                    { label: 'Edit', icon: Pencil, permission: PERMS.hostel.manage, onSelect: () => b.openEdit(x) },
                    { label: 'Delete', icon: Trash2, permission: PERMS.hostel.manage, destructive: true, onSelect: () => b.openDelete(x) },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <SectionHeader
          title="Room types"
          action={
            <PermissionGate permission={PERMS.hostel.manage}>
              <Button variant="outline" onClick={t.openCreate}>
                <Plus aria-hidden /> Add room type
              </Button>
            </PermissionGate>
          }
        />
        {(types.data?.results ?? []).length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No room types yet: add Single, Double, Triple… with their fee per term.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {types.data!.results.map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="flex-1 font-medium">{x.name}</span>
                <span className="text-muted-foreground">{x.fee_category_name ?? 'not billed'}</span>
                <Money value={x.fee_per_term} />
                <RowActions
                  actions={[
                    { label: 'Edit', icon: Pencil, permission: PERMS.hostel.manage, onSelect: () => t.openEdit(x) },
                    { label: 'Delete', icon: Trash2, permission: PERMS.hostel.manage, destructive: true, onSelect: () => t.openDelete(x) },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <BuildingDialog open={b.formOpen} record={b.record} onOpenChange={(o) => !o && b.closeForm()} />
      <RoomTypeDialog open={t.formOpen} record={t.record} onOpenChange={(o) => !o && t.closeForm()} />
      <Dialog open={floorsOf != null} onOpenChange={(o) => !o && setFloorsOf(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Floors</DialogTitle>
            <DialogDescription>Rooms are numbered within a floor of the building.</DialogDescription>
          </DialogHeader>
          {floorsOf && <Floors building={floorsOf} />}
        </DialogContent>
      </Dialog>
      {b.deleting && <DeleteDialog open onOpenChange={(o) => !o && b.closeDelete()} subject={`“${b.deleting.name}”`} onConfirm={async () => { await removeBuilding.mutateAsync(b.deleting!.id); toast.success('Deleted.') }} />}
      {t.deleting && <DeleteDialog open onOpenChange={(o) => !o && t.closeDelete()} subject={`“${t.deleting.name}”`} onConfirm={async () => { await removeType.mutateAsync(t.deleting!.id); toast.success('Deleted.') }} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rooms and beds
// ---------------------------------------------------------------------------
const roomSchema = z.object({ building: z.string().min(1, 'Choose a building.'), floor: z.string().min(1, 'Choose a floor.'), number: z.string().trim().min(1, 'Required.').max(20), room_type: z.string().min(1, 'Choose a type.'), beds: z.string().regex(/^\d*$/, 'A number.'), note: z.string().max(255), is_active: z.boolean() })

function RoomDialog({ open, record, onOpenChange }: { open: boolean; record: HostelRoom | null; onOpenChange: (o: boolean) => void }) {
  const buildings = useBuildingOptions()
  const types = useRoomTypes({ ...PICKER_PARAMS, is_active: true })
  const create = useCreateRoom()
  const update = useUpdateRoom()
  const createBed = useCreateBed()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit room ${record.number}` : 'Add room'}
      schema={roomSchema}
      defaultValues={{ building: record ? String(record.building) : '', floor: record ? String(record.floor) : '', number: record?.number ?? '', room_type: record ? String(record.room_type) : '', beds: record ? '' : '2', note: record?.note ?? '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        const input = { building: Number(v.building), floor: Number(v.floor), number: v.number, room_type: Number(v.room_type), note: v.note, is_active: v.is_active }
        if (record) {
          await update.mutateAsync({ id: record.id, input })
          toast.success('Room saved.')
          return
        }
        const room = await create.mutateAsync(input)
        const n = Number(v.beds || 0)
        for (let i = 0; i < n; i++) await createBed.mutateAsync({ room: room.id, label: String.fromCharCode(65 + i), is_active: true })
        toast.success(`Room ${room.number} added${n ? ` with ${n} bed${n === 1 ? '' : 's'}` : ''}.`)
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Building" required error={errors.building?.message}>
              {(p) => <Controller control={control} name="building" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={buildings} />} />}
            </FormField>
            <FormField label="Floor" required error={errors.floor?.message}>
              {(p) => <Controller control={control} name="floor" render={({ field }) => <FloorSelect {...p} building={watch('building')} value={field.value} onChange={field.onChange} />} />}
            </FormField>
            <FormField label="Room number" required error={errors.number?.message}>
              <Input {...register('number')} placeholder="101" />
            </FormField>
            <FormField label="Type" required error={errors.room_type?.message}>
              {(p) => <Controller control={control} name="room_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(types.data?.results ?? []).map((x) => ({ value: String(x.id), label: x.name }))} />} />}
            </FormField>
            {!record && (
              <FormField label="Beds" error={errors.beds?.message} description="Labelled A, B, C…">
                <Input {...register('beds')} inputMode="numeric" />
              </FormField>
            )}
          </div>
          <FormField label="Note">
            <Input {...register('note')} maxLength={255} />
          </FormField>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> In use
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

function FloorSelect({ building, value, onChange, ...p }: { building: string; value: string; onChange: (v: string) => void; id?: string }) {
  const floors = useFloors({ ...PICKER_PARAMS, building: building || undefined }, { enabled: Boolean(building) })
  return <SelectControl {...p} value={value} onChange={onChange} disabled={!building} options={(floors.data?.results ?? []).map((f) => ({ value: String(f.id), label: f.number === 0 ? 'Ground' : `Floor ${f.number}` }))} placeholder={building ? 'Choose…' : 'Choose the building first'} />
}

function BedsDialog({ room, onClose }: { room: HostelRoom | null; onClose: () => void }) {
  const beds = useBeds({ ...PICKER_PARAMS, room: room?.id }, { enabled: room != null })
  const create = useCreateBed()
  const remove = useRemoveBed()
  const next = String.fromCharCode(65 + (beds.data?.results.length ?? 0))
  return (
    <Dialog open={room != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Beds in room {room?.number}</DialogTitle>
          <DialogDescription>A bed that was ever allocated can’t be deleted.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-md border text-sm">
          {(beds.data?.results ?? []).map((b) => (
            <li key={b.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="flex-1 font-medium">Bed {b.label}</span>
              <span className="text-muted-foreground">{b.occupant ? b.occupant.name : 'Free'}</span>
              <PermissionGate permission={PERMS.hostel.manage}>
                <Button size="icon" variant="ghost" aria-label={`Delete bed ${b.label}`} disabled={b.occupant != null} onClick={() => void remove.mutateAsync(b.id).then(() => toast.success('Bed deleted.'), (e: Error) => toast.error(e.message))}>
                  <Trash2 aria-hidden />
                </Button>
              </PermissionGate>
            </li>
          ))}
        </ul>
        <PermissionGate permission={PERMS.hostel.manage}>
          <Button variant="outline" onClick={() => void create.mutateAsync({ room: room!.id, label: next, is_active: true }).then(() => toast.success(`Bed ${next} added.`))}>
            <Plus aria-hidden /> Add bed {next}
          </Button>
        </PermissionGate>
      </DialogContent>
    </Dialog>
  )
}

/** Every hostel room: its type, beds and how many are taken. */
export function RoomsPage() {
  const list = useListState({ filters: ['building', 'room_type', 'is_active'] })
  const query = useRooms(list.query)
  const buildings = useBuildingOptions()
  const types = useRoomTypes({ ...PICKER_PARAMS })
  const crud = useCrudState<HostelRoom>()
  const remove = useRemoveRoom()
  const [bedsOf, setBedsOf] = useState<HostelRoom | null>(null)
  const columns: Column<HostelRoom>[] = [
    { id: 'number', header: 'Room', mobile: 'title', cell: (r) => <span className="font-medium">{r.number}</span> },
    { id: 'building', header: 'Building', cell: (r) => r.building_name },
    { id: 'type', header: 'Type', cell: (r) => r.room_type_name },
    { id: 'beds', header: 'Taken', className: 'tabular-nums', cell: (r) => <span className={r.occupied >= r.beds && r.beds > 0 ? 'font-medium' : undefined}>{`${r.occupied} of ${r.beds}`}</span> },
    { id: 'status', header: 'Status', cell: (r) => (r.is_active === false ? <StatusBadge status="inactive" label="Closed" /> : null) },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Hostel rooms"
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder="Room number or building…"
        toolbar={
          <PermissionGate permission={PERMS.hostel.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add room
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'building', label: 'Building', options: buildings },
          { name: 'room_type', label: 'Type', options: (types.data?.results ?? []).map((x) => ({ value: String(x.id), label: x.name })) },
        ]}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: 'Beds', icon: BedDouble, onSelect: () => setBedsOf(r) },
              { label: 'Edit', icon: Pencil, permission: PERMS.hostel.manage, onSelect: () => crud.openEdit(r) },
              { label: 'Delete', icon: Trash2, permission: PERMS.hostel.manage, destructive: true, onSelect: () => crud.openDelete(r) },
            ]}
          />
        )}
        empty={{ title: 'No rooms yet', description: 'Add buildings, floors and room types first.' }}
      />
      <RoomDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <BedsDialog room={bedsOf} onClose={() => setBedsOf(null)} />
      {crud.deleting && <DeleteDialog open onOpenChange={(o) => !o && crud.closeDelete()} subject={`room ${crud.deleting.number}`} onConfirm={async () => { await remove.mutateAsync(crud.deleting!.id); toast.success('Deleted.') }} />}
    </>
  )
}
