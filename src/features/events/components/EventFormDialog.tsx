import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { toast } from '@/hooks/useToast'
import { combineLocal, splitLocal } from '@/lib/dates'
import { enumOptions } from '@/lib/formatters'
import { isoDate, optionalIsoDate, optionalWholeNumber, requiredId, toNullableInt } from '@/lib/validation'
import type { Schema } from '@/shared/types/api'
import type { Event, EventInput } from '../api/events.api'
import { useCategoryOptions, useCreateEvent, useUpdateEvent } from '../hooks/useEvents'

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM.')

const schema = z
  .object({
    name: z.string().trim().min(1, 'Required.').max(200),
    category: requiredId('Choose a category.'),
    campus: z.string(),
    venue: z.string().trim().max(200),
    description: z.string(),
    start_date: isoDate,
    start_time: time,
    end_date: isoDate,
    end_time: time,
    registration_mode: z.enum(['none', 'open', 'approval']),
    deadline_date: optionalIsoDate,
    capacity: optionalWholeNumber,
    organized_by: z.string(),
  })
  .refine((v) => `${v.end_date}T${v.end_time}` >= `${v.start_date}T${v.start_time}`, { path: ['end_time'], message: 'Must not be before the start.' })
type EventForm = z.infer<typeof schema>

const defaults = (e: Event | null): EventForm => {
  const start = splitLocal(e?.start_at)
  const end = splitLocal(e?.end_at)
  return {
    name: e?.name ?? '',
    category: e ? String(e.category) : '',
    campus: e?.campus ? String(e.campus) : '',
    venue: e?.venue ?? '',
    description: e?.description ?? '',
    start_date: start.date,
    start_time: start.time || '10:00',
    end_date: end.date,
    end_time: end.time || '16:00',
    registration_mode: (e?.registration_mode as EventForm['registration_mode']) ?? 'none',
    deadline_date: splitLocal(e?.registration_deadline).date,
    capacity: e?.capacity != null ? String(e.capacity) : '',
    organized_by: e?.organized_by ? String(e.organized_by) : '',
  }
}

const toInput = (v: EventForm): EventInput => ({
  name: v.name,
  category: Number(v.category),
  campus: v.campus ? Number(v.campus) : null,
  venue: v.venue,
  description: v.description,
  start_at: combineLocal(v.start_date, v.start_time),
  end_at: combineLocal(v.end_date, v.end_time),
  registration_mode: v.registration_mode as Schema<'RegistrationModeEnum'>,
  // Sign-up closes at the end of the chosen day.
  registration_deadline: v.registration_mode !== 'none' && v.deadline_date ? combineLocal(v.deadline_date, '23:59') : null,
  capacity: v.registration_mode !== 'none' ? toNullableInt(v.capacity) : null,
  organized_by: toNullableInt(v.organized_by),
})

export function EventFormDialog({ open, onOpenChange, record, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; record: Event | null; onCreated?: (e: Event) => void }) {
  const create = useCreateEvent()
  const update = useUpdateEvent()
  const categories = useCategoryOptions()
  const staff = useStaffOptions()
  const { isMultiBranch, branches } = useBranches()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? `Edit ${record.name}` : 'New event'}
      description={record ? undefined : 'Saved as “being set up”. Students see it once you publish.'}
      submitLabel={record ? 'Save' : 'Create event'}
      schema={schema}
      defaultValues={defaults(record)}
      onSubmit={async (v) => {
        if (record) {
          await update.mutateAsync({ id: record.id, input: toInput(v) })
          toast.success('Event saved.')
        } else {
          const e = await create.mutateAsync(toInput(v))
          toast.success(`${e.name} created.`)
          onCreated?.(e)
        }
      }}
    >
      {({ register, control, watch, formState: { errors } }) => {
        const mode = watch('registration_mode')
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <FormField label="Name" required error={errors.name?.message}>
                <Input {...register('name')} autoFocus placeholder="Annual sports day" />
              </FormField>
              <FormField
                label="Category"
                required
                error={errors.category?.message}
                description={categories.data?.length === 0 ? 'Add a category first, under Categories.' : undefined}
              >
                {(p) => (
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <SelectControl {...p} value={field.value} onChange={field.onChange} loading={categories.isPending} options={(categories.data ?? []).filter((c) => c.is_active !== false || String(c.id) === field.value).map((c) => ({ value: String(c.id), label: c.name }))} />
                    )}
                  />
                )}
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <FormField label="Starts (AD)" required error={errors.start_date?.message} className="sm:col-span-1">
                {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
              </FormField>
              <FormField label="at" required error={errors.start_time?.message}>
                <Input {...register('start_time')} type="time" />
              </FormField>
              <FormField label="Ends (AD)" required error={errors.end_date?.message}>
                {(p) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
              </FormField>
              <FormField label="at " required error={errors.end_time?.message}>
                <Input {...register('end_time')} type="time" />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Venue" error={errors.venue?.message}>
                <Input {...register('venue')} placeholder="Main ground" />
              </FormField>
              {staff.canPick && (
                <FormField label="Organizer" error={errors.organized_by?.message} description="They can run check-in and results.">
                  {(p) => (
                    <Controller
                      control={control}
                      name="organized_by"
                      render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="The office" loading={staff.isPending} options={staff.data ?? []} />}
                    />
                  )}
                </FormField>
              )}
            </div>
            {isMultiBranch && (
              <FormField label="Branch" error={errors.campus?.message} className="sm:max-w-sm">
                {(p) => (
                  <Controller
                    control={control}
                    name="campus"
                    render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="All branches" options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />}
                  />
                )}
              </FormField>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Sign-up" error={errors.registration_mode?.message}>
                {(p) => (
                  <Controller control={control} name="registration_mode" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('RegistrationModeEnum')} />} />
                )}
              </FormField>
              {mode !== 'none' && (
                <>
                  <FormField label="Sign-up closes (AD)" error={errors.deadline_date?.message} description="End of that day. Empty: until it starts.">
                    {(p) => <Controller control={control} name="deadline_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
                  </FormField>
                  <FormField label="Places" error={errors.capacity?.message} description="Empty for no limit.">
                    <Input {...register('capacity')} inputMode="numeric" />
                  </FormField>
                </>
              )}
            </div>
            <FormField label="Description" error={errors.description?.message}>
              <Textarea {...register('description')} rows={3} />
            </FormField>
          </>
        )
      }}
    </FormDialog>
  )
}
