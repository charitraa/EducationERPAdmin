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
import { tr } from '@/lib/i18n'

// ---------------------------------------------------------------------------
// Buildings, floors, room types
// ---------------------------------------------------------------------------
const buildingSchema = z.object({ campus: z.string().min(1, tr('Choose a branch.')), code, name: z.string().trim().min(1, tr('Required.')).max(100), gender: z.string(), warden: z.string(), is_active: z.boolean() })

function BuildingDialog({ open, record, onOpenChange }: { open: boolean; record: Building | null; onOpenChange: (o: boolean) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const staff = useStaffOptions()
  const create = useCreateBuilding()
  const update = useUpdateBuilding()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit building') : tr('Add building')}
      schema={buildingSchema}
      defaultValues={{ campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''), code: record?.code ?? '', name: record?.name ?? '', gender: record?.gender ?? 'mixed', warden: record?.warden ? String(record.warden) : '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        const input = { ...v, campus: Number(v.campus), gender: v.gender as Building['gender'] & string, warden: v.warden ? Number(v.warden) : null }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Building saved.') : tr('Building added. Add its floors next.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label={tr('Code')} required error={errors.code?.message}>
              <Input {...register('code')} placeholder="girls-a" />
            </FormField>
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('Girls’ Hostel A')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {isMultiBranch && (
              <FormField label={tr('Branch')} required error={errors.campus?.message}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
            <FormField label={tr('For')}>
              {(p) => <Controller control={control} name="gender" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('BuildingGenderEnum')} />} />}
            </FormField>
            <FormField label={tr('Warden')}>
              {(p) => <Controller control={control} name="warden" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('None')} options={staff.data ?? []} />} />}
            </FormField>
          </div>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('In use')}
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
      title={tr('Floors of {name}', { name: building.name })}
      noun={tr('floor')}
      fields={[{ name: 'number', label: tr('Number (0 = ground)'), required: true }, { name: 'name', label: tr('Name') }]}
      query={useFloors({ ...PICKER_PARAMS, building: building.id })}
      create={useCreateFloor() as never}
      update={useUpdateFloor() as never}
      remove={useRemoveFloor()}
      label={(r) => `${r.number === 0 ? 'Ground' : `Floor ${r.number}`}${r.name ? ` · ${r.name}` : ''}`}
      extra={{ building: building.id }}
    />
  )
}

const typeSchema = z.object({ code, name: z.string().trim().min(1, tr('Required.')).max(100), fee_per_term: z.union([z.literal(''), moneyInput]), fee_category: z.string(), description: z.string(), is_active: z.boolean() })

function RoomTypeDialog({ open, record, onOpenChange }: { open: boolean; record: RoomType | null; onOpenChange: (o: boolean) => void }) {
  const { can } = usePermissions()
  const categories = useCategoryOptions()
  const create = useCreateRoomType()
  const update = useUpdateRoomType()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit room type') : tr('Add room type')}
      description={tr('What a bed in this kind of room costs per term. Hostel invoices are billed under the fee category.')}
      schema={typeSchema}
      defaultValues={{ code: record?.code ?? '', name: record?.name ?? '', fee_per_term: record?.fee_per_term ?? '', fee_category: record?.fee_category ? String(record.fee_category) : '', description: record?.description ?? '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        const input = { ...v, fee_per_term: v.fee_per_term || '0', fee_category: v.fee_category ? Number(v.fee_category) : null }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Room type saved.') : tr('Room type added.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label={tr('Code')} required error={errors.code?.message}>
              <Input {...register('code')} placeholder="triple" />
            </FormField>
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('Triple sharing')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Fee per term')} error={errors.fee_per_term?.message}>
              <Input {...register('fee_per_term')} inputMode="decimal" className="tabular-nums" />
            </FormField>
            {can(PERMS.finance.view) && (
              <FormField label={tr('Fee category')}>
                {(p) => <Controller control={control} name="fee_category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('None (not billed)')} options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />} />}
              </FormField>
            )}
          </div>
          <FormField label={tr('Description')}>
            <Input {...register('description')} />
          </FormField>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('In use')}
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
          title={tr('Buildings')}
          action={
            <PermissionGate permission={PERMS.hostel.manage}>
              <Button onClick={b.openCreate}>
                <Plus aria-hidden /> {tr('Add building')}
              </Button>
            </PermissionGate>
          }
        />
        {buildings.isPending ? (
          <TableSkeleton rows={2} columns={3} />
        ) : buildings.isError ? (
          <ErrorState error={buildings.error} onRetry={() => void buildings.refetch()} />
        ) : buildings.data.results.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('No buildings yet.')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.data.results.map((x) => (
              <li key={x.id} className="flex items-start gap-2 rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{x.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {enumLabel('BuildingGenderEnum', x.gender)}
                    {x.warden_name ? ' · ' + tr('warden {warden_name}', { warden_name: x.warden_name }) : ''}
                  </p>
                  <button type="button" className="mt-1 text-xs underline" onClick={() => setFloorsOf(x)}>
                    {tr('Floors')}
                  </button>
                </div>
                {x.is_active === false && <StatusBadge status="inactive" label={tr('Closed')} />}
                <RowActions
                  actions={[
                    { label: tr('Edit'), icon: Pencil, permission: PERMS.hostel.manage, onSelect: () => b.openEdit(x) },
                    { label: tr('Delete'), icon: Trash2, permission: PERMS.hostel.manage, destructive: true, onSelect: () => b.openDelete(x) },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <SectionHeader
          title={tr('Room types')}
          action={
            <PermissionGate permission={PERMS.hostel.manage}>
              <Button variant="outline" onClick={t.openCreate}>
                <Plus aria-hidden /> {tr('Add room type')}
              </Button>
            </PermissionGate>
          }
        />
        {(types.data?.results ?? []).length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('No room types yet: add Single, Double, Triple… with their fee per term.')}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {types.data!.results.map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="flex-1 font-medium">{x.name}</span>
                <span className="text-muted-foreground">{x.fee_category_name ?? tr('not billed')}</span>
                <Money value={x.fee_per_term} />
                <RowActions
                  actions={[
                    { label: tr('Edit'), icon: Pencil, permission: PERMS.hostel.manage, onSelect: () => t.openEdit(x) },
                    { label: tr('Delete'), icon: Trash2, permission: PERMS.hostel.manage, destructive: true, onSelect: () => t.openDelete(x) },
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
            <DialogTitle>{tr('Floors')}</DialogTitle>
            <DialogDescription>{tr('Rooms are numbered within a floor of the building.')}</DialogDescription>
          </DialogHeader>
          {floorsOf && <Floors building={floorsOf} />}
        </DialogContent>
      </Dialog>
      {b.deleting && <DeleteDialog open onOpenChange={(o) => !o && b.closeDelete()} subject={`“${b.deleting.name}”`} onConfirm={async () => { await removeBuilding.mutateAsync(b.deleting!.id); toast.success(tr('Deleted.')) }} />}
      {t.deleting && <DeleteDialog open onOpenChange={(o) => !o && t.closeDelete()} subject={`“${t.deleting.name}”`} onConfirm={async () => { await removeType.mutateAsync(t.deleting!.id); toast.success(tr('Deleted.')) }} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Rooms and beds
// ---------------------------------------------------------------------------
const roomSchema = z.object({ building: z.string().min(1, tr('Choose a building.')), floor: z.string().min(1, tr('Choose a floor.')), number: z.string().trim().min(1, tr('Required.')).max(20), room_type: z.string().min(1, tr('Choose a type.')), beds: z.string().regex(/^\d*$/, tr('A number.')), note: z.string().max(255), is_active: z.boolean() })

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
      title={record ? tr('Edit room {number}', { number: record.number }) : tr('Add room')}
      schema={roomSchema}
      defaultValues={{ building: record ? String(record.building) : '', floor: record ? String(record.floor) : '', number: record?.number ?? '', room_type: record ? String(record.room_type) : '', beds: record ? '' : '2', note: record?.note ?? '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        const input = { building: Number(v.building), floor: Number(v.floor), number: v.number, room_type: Number(v.room_type), note: v.note, is_active: v.is_active }
        if (record) {
          await update.mutateAsync({ id: record.id, input })
          toast.success(tr('Room saved.'))
          return
        }
        const room = await create.mutateAsync(input)
        const n = Number(v.beds || 0)
        for (let i = 0; i < n; i++) await createBed.mutateAsync({ room: room.id, label: String.fromCharCode(65 + i), is_active: true })
        toast.success(n ? tr('Room {number} added with {n} beds.', { number: room.number, n }) : tr('Room {number} added.', { number: room.number }))
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Building')} required error={errors.building?.message}>
              {(p) => <Controller control={control} name="building" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={buildings} />} />}
            </FormField>
            <FormField label={tr('Floor')} required error={errors.floor?.message}>
              {(p) => <Controller control={control} name="floor" render={({ field }) => <FloorSelect {...p} building={watch('building')} value={field.value} onChange={field.onChange} />} />}
            </FormField>
            <FormField label={tr('Room number')} required error={errors.number?.message}>
              <Input {...register('number')} placeholder="101" />
            </FormField>
            <FormField label={tr('Type')} required error={errors.room_type?.message}>
              {(p) => <Controller control={control} name="room_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(types.data?.results ?? []).map((x) => ({ value: String(x.id), label: x.name }))} />} />}
            </FormField>
            {!record && (
              <FormField label={tr('Beds')} error={errors.beds?.message} description={tr('Labelled A, B, C…')}>
                <Input {...register('beds')} inputMode="numeric" />
              </FormField>
            )}
          </div>
          <FormField label={tr('Note')}>
            <Input {...register('note')} maxLength={255} />
          </FormField>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('In use')}
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

function FloorSelect({ building, value, onChange, ...p }: { building: string; value: string; onChange: (v: string) => void; id?: string }) {
  const floors = useFloors({ ...PICKER_PARAMS, building: building || undefined }, { enabled: Boolean(building) })
  return <SelectControl {...p} value={value} onChange={onChange} disabled={!building} options={(floors.data?.results ?? []).map((f) => ({ value: String(f.id), label: f.number === 0 ? tr('Ground') : tr('Floor {number}', { number: f.number }) }))} placeholder={building ? tr('Choose…') : tr('Choose the building first')} />
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
          <DialogTitle>{tr('Beds in room')} {room?.number}</DialogTitle>
          <DialogDescription>{tr('A bed that was ever allocated can’t be deleted.')}</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-md border text-sm">
          {(beds.data?.results ?? []).map((b) => (
            <li key={b.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="flex-1 font-medium">{tr('Bed {label}', { label: b.label })}</span>
              <span className="text-muted-foreground">{b.occupant ? b.occupant.name : tr('Free')}</span>
              <PermissionGate permission={PERMS.hostel.manage}>
                <Button size="icon" variant="ghost" aria-label={tr('Delete bed {label}', { label: b.label })} disabled={b.occupant != null} onClick={() => void remove.mutateAsync(b.id).then(() => toast.success(tr('Bed deleted.')), (e: Error) => toast.error(e.message))}>
                  <Trash2 aria-hidden />
                </Button>
              </PermissionGate>
            </li>
          ))}
        </ul>
        <PermissionGate permission={PERMS.hostel.manage}>
          <Button variant="outline" onClick={() => void create.mutateAsync({ room: room!.id, label: next, is_active: true }).then(() => toast.success(tr('Bed {next} added.', { next })))}>
            <Plus aria-hidden /> {tr('Add bed {next}', { next })}
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
    { id: 'number', header: tr('Room'), mobile: 'title', cell: (r) => <span className="font-medium">{r.number}</span> },
    { id: 'building', header: tr('Building'), cell: (r) => r.building_name },
    { id: 'type', header: tr('Type'), cell: (r) => r.room_type_name },
    { id: 'beds', header: tr('Taken'), className: 'tabular-nums', cell: (r) => <span className={r.occupied >= r.beds && r.beds > 0 ? 'font-medium' : undefined}>{tr('{occupied} of {beds}', { occupied: r.occupied, beds: r.beds })}</span> },
    { id: 'status', header: tr('Status'), cell: (r) => (r.is_active === false ? <StatusBadge status="inactive" label={tr('Closed')} /> : null) },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Hostel rooms')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder={tr('Room number or building…')}
        toolbar={
          <PermissionGate permission={PERMS.hostel.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add room')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'building', label: tr('Building'), options: buildings },
          { name: 'room_type', label: tr('Type'), options: (types.data?.results ?? []).map((x) => ({ value: String(x.id), label: x.name })) },
        ]}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: tr('Beds'), icon: BedDouble, onSelect: () => setBedsOf(r) },
              { label: tr('Edit'), icon: Pencil, permission: PERMS.hostel.manage, onSelect: () => crud.openEdit(r) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.hostel.manage, destructive: true, onSelect: () => crud.openDelete(r) },
            ]}
          />
        )}
        empty={{ title: tr('No rooms yet'), description: tr('Add buildings, floors and room types first.') }}
      />
      <RoomDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <BedsDialog room={bedsOf} onClose={() => setBedsOf(null)} />
      {crud.deleting && <DeleteDialog open onOpenChange={(o) => !o && crud.closeDelete()} subject={tr('room {number}', { number: crud.deleting.number })} onConfirm={async () => { await remove.mutateAsync(crud.deleting!.id); toast.success(tr('Deleted.')) }} />}
    </>
  )
}
