import { Controller } from 'react-hook-form'
import { useBranches } from '@/app/providers/BranchProvider'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/useToast'
import { enumOptions } from '@/lib/formatters'
import type { Room } from '../api/rooms.api'
import { useCreateRoom, useUpdateRoom } from '../hooks/useRooms'
import { roomDefaults, roomSchema, toRoomInput } from '../schemas/room.schema'

export function RoomFormDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: Room | null }) {
  const create = useCreateRoom()
  const update = useUpdateRoom()
  const { isMultiBranch, branches, defaultBranchId } = useBranches()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? 'Edit room' : 'Add room'}
      schema={roomSchema}
      defaultValues={roomDefaults(record, defaultBranchId)}
      onSubmit={async (values) => {
        const input = toRoomInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Room updated.' : 'Room added.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          {isMultiBranch && (
            <FormField label="Branch" required error={errors.campus?.message}>
              {(p) => (
                <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />
              )}
            </FormField>
          )}
          {!isMultiBranch && errors.campus && <p className="text-sm text-danger">{errors.campus.message}</p>}
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} placeholder="R-101" autoFocus />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Room 101" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Type" error={errors.room_type?.message}>
              {(p) => <Controller control={control} name="room_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('RoomTypeEnum')} />} />}
            </FormField>
            <FormField label="Building" error={errors.building?.message}>
              <Input {...register('building')} placeholder="Main block" />
            </FormField>
            <FormField label="Floor" error={errors.floor?.message}>
              <Input {...register('floor')} placeholder="1" />
            </FormField>
          </div>
          <FormField label="Seats" error={errors.capacity?.message} className="sm:max-w-40">
            <Input {...register('capacity')} inputMode="numeric" />
          </FormField>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> In use
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}
