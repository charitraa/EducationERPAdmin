import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { useBranches } from '@/app/providers/BranchProvider'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { enumOptions } from '@/lib/formatters'
import { levelLabel, programLevels } from '../../programs/api/programs.api'
import { useProgramOptions } from '../../programs/hooks/usePrograms'
import { WEEKDAYS, type CalendarEvent } from '../api/calendar.api'
import { useCreateCalendarEvent, useUpdateCalendarEvent } from '../hooks/useCalendar'
import { calendarEventDefaults, calendarEventSchema, toCalendarEventInput, type CalendarEventForm } from '../schemas/calendar-event.schema'

function CalendarEventFields({ form }: { form: UseFormReturn<CalendarEventForm> }) {
  const { register, control, formState: { errors } } = form
  const { isMultiBranch, branches } = useBranches()
  const programs = useProgramOptions()
  const [kind, programId] = useWatch({ control, name: ['kind', 'program'] })
  const program = programs.data?.find((p) => String(p.id) === programId)
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <FormField label="What" required error={errors.kind?.message}>
          {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('CalendarEventKindEnum')} />} />}
        </FormField>
        <FormField label="Title" required error={errors.title?.message}>
          <Input {...register('title')} placeholder="Dashain holidays" autoFocus />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="From" required error={errors.start_date?.message}>
          {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
        </FormField>
        <FormField label="To" required error={errors.end_date?.message} description="Same as From for one day.">
          {(p) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
        </FormField>
      </div>
      {kind === 'makeup_day' && (
        <FormField label="Run the timetable of" required error={errors.runs_timetable_of?.message}>
          {(p) => (
            <Controller
              control={control}
              name="runs_timetable_of"
              render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={WEEKDAYS.map((d, i) => ({ value: String(i + 1), label: d }))} />}
            />
          )}
        </FormField>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {isMultiBranch && (
          <FormField label="Branch" error={errors.campus?.message}>
            {(p) => (
              <Controller
                control={control}
                name="campus"
                render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Every branch" options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />}
              />
            )}
          </FormField>
        )}
        <FormField label="Program" error={errors.program?.message}>
          {(p) => (
            <Controller
              control={control}
              name="program"
              render={({ field }) => (
                <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Every program" options={(programs.data ?? []).map((pr) => ({ value: String(pr.id), label: pr.name }))} />
              )}
            />
          )}
        </FormField>
        {program && (
          <FormField label="Level" error={errors.level?.message}>
            {(p) => (
              <Controller
                control={control}
                name="level"
                render={({ field }) => (
                  <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Every level" options={programLevels(program).map((l) => ({ value: String(l), label: levelLabel(program, l) }))} />
                )}
              />
            )}
          </FormField>
        )}
      </div>
      <FormField label="Classes on these days" error={errors.suspends_classes?.message}>
        {(p) => (
          <Controller
            control={control}
            name="suspends_classes"
            render={({ field }) => (
              <SelectControl
                {...p}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'default', label: 'Usual for this kind (off for holidays, closures, exams)' },
                  { value: 'yes', label: 'No classes' },
                  { value: 'no', label: 'Classes run as normal' },
                ]}
              />
            )}
          />
        )}
      </FormField>
      <FormField label="Notes" error={errors.description?.message}>
        <Textarea {...register('description')} rows={2} />
      </FormField>
    </>
  )
}

export function CalendarEventFormDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: CalendarEvent | null }) {
  const create = useCreateCalendarEvent()
  const update = useUpdateCalendarEvent()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? 'Edit calendar entry' : 'Add to calendar'}
      description="Holidays, closures and exam days stop the timetable and roll calls automatically."
      schema={calendarEventSchema}
      defaultValues={calendarEventDefaults(record)}
      onSubmit={async (values) => {
        const input = toCalendarEventInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Calendar updated.' : 'Added to the calendar.')
      }}
    >
      {(form) => <CalendarEventFields form={form} />}
    </FormDialog>
  )
}
