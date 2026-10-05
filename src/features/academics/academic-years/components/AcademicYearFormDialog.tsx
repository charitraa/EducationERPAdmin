import { Controller } from 'react-hook-form'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/useToast'
import type { AcademicYear } from '../api/academic-years.api'
import { useCreateAcademicYear, useUpdateAcademicYear } from '../hooks/useAcademicYears'
import { academicYearDefaults, academicYearSchema, toAcademicYearInput } from '../schemas/academic-year.schema'
import { tr } from '@/lib/i18n'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: AcademicYear | null
  onSaved?: (year: AcademicYear) => void
}

export function AcademicYearFormDialog({ open, onOpenChange, record, onSaved }: Props) {
  const create = useCreateAcademicYear()
  const update = useUpdateAcademicYear()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit academic year') : tr('Add academic year')}
      description={tr('Name it the way your school does, in BS or AD: 2082/83, or 2026-27.')}
      schema={academicYearSchema}
      defaultValues={academicYearDefaults(record)}
      onSubmit={async (values) => {
        const input = toAcademicYearInput(values)
        const saved = record ? await update.mutateAsync({ id: record.id, input }) : await create.mutateAsync(input)
        toast.success(record ? tr('Academic year updated.') : tr('Academic year added.'))
        onSaved?.(saved)
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label={tr('Name')} required error={errors.name?.message}>
            <Input {...register('name')} placeholder="2082/83" autoFocus />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Starts')} required error={errors.start_date?.message}>
              {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
            </FormField>
            <FormField label={tr('Ends')} required error={errors.end_date?.message}>
              {(p) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
            </FormField>
          </div>
        </>
      )}
    </FormDialog>
  )
}
