import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { combineLocal, formatDateTime } from '@/lib/dates'
import { isoDate, requiredId } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import type { Slot } from '../api/communication.api'
import { useBookAppointment, usePublishSlot } from '../hooks/useCommunication'

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour).')

const slotSchema = z
  .object({ staff: requiredId('Choose who meets.'), campus: requiredId('Choose a branch.'), date: isoDate, start: time, end: time, location: z.string().trim().max(200) })
  .refine((v) => v.end > v.start, { path: ['end'], message: 'Must be after the start.' })

/** Staff publish their own slots; the office (manage_slots) can publish for anyone. */
export function PublishSlotDialog({ open, onOpenChange, myStaffId }: { open: boolean; onOpenChange: (o: boolean) => void; myStaffId: Id | null }) {
  const publish = usePublishSlot()
  const { can } = usePermissions()
  const office = can(PERMS.communication.manageSlots)
  const staff = useStaffOptions()
  const { isMultiBranch, branches, defaultBranchId } = useBranches()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Publish a meeting slot"
      description="Parents and students can book it. Each slot takes one booking."
      submitLabel="Publish"
      schema={slotSchema}
      defaultValues={{ staff: myStaffId ? String(myStaffId) : '', campus: defaultBranchId ? String(defaultBranchId) : '', date: '', start: '', end: '', location: '' }}
      onSubmit={async (v) => {
        await publish.mutateAsync({
          staff: Number(v.staff),
          campus: Number(v.campus),
          starts_at: combineLocal(v.date, v.start),
          ends_at: combineLocal(v.date, v.end),
          location: v.location,
        })
        toast.success('Slot published.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          {office && staff.canPick ? (
            <FormField label="With" required error={errors.staff?.message}>
              {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} loading={staff.isPending} options={staff.data ?? []} />} />}
            </FormField>
          ) : (
            errors.staff && <p className="text-sm text-danger">Your login isn’t linked to a staff record, so you can’t publish slots.</p>
          )}
          {isMultiBranch && (
            <FormField label="Branch" required error={errors.campus?.message}>
              {(p) => (
                <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />
              )}
            </FormField>
          )}
          <FormField label="Date (AD)" required error={errors.date?.message}>
            {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} {...field} />} />}
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="From" required error={errors.start?.message}>
              <Input {...register('start')} type="time" />
            </FormField>
            <FormField label="To" required error={errors.end?.message}>
              <Input {...register('end')} type="time" />
            </FormField>
          </div>
          <FormField label="Where" error={errors.location?.message}>
            <Input {...register('location')} placeholder="Staff room, Room 12, phone call…" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

const bookSchema = z.object({ student: z.custom<Student | null>(), reason: z.string().trim().max(255) })

/** The office books a slot for a family (e.g. after a phone call). */
export function BookSlotDialog({ slot, onClose }: { slot: Slot | null; onClose: () => void }) {
  const book = useBookAppointment()
  return (
    <FormDialog
      open={slot !== null}
      onOpenChange={(o) => !o && onClose()}
      wide
      title="Book this slot"
      description={slot ? `${slot.staff_name} · ${formatDateTime(slot.starts_at)}${slot.location ? ` · ${slot.location}` : ''}` : ''}
      submitLabel="Book"
      schema={bookSchema}
      defaultValues={{ student: null, reason: '' }}
      onSubmit={async (v) => {
        await book.mutateAsync({ slot: slot!.id, student: v.student?.id ?? null, reason: v.reason })
        toast.success('Booked. It’s waiting for the staff member to approve.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label="About which student" error={errors.student?.message} description="Optional, but it helps the teacher prepare.">
            {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
          </FormField>
          <FormField label="Reason" error={errors.reason?.message}>
            <Textarea {...register('reason')} rows={2} maxLength={255} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
