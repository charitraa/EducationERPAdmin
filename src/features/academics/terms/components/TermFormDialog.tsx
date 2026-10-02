import { Controller } from 'react-hook-form'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/useToast'
import { useAcademicYearOptions } from '../../academic-years/hooks/useAcademicYears'
import type { Term } from '../api/terms.api'
import { useCreateTerm, useUpdateTerm } from '../hooks/useTerms'
import { termDefaults, termSchema, toTermInput } from '../schemas/term.schema'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  record: Term | null
  defaultAcademicYear?: number | null
  nextSequence?: number
}

export function TermFormDialog({ open, onOpenChange, record, defaultAcademicYear, nextSequence }: Props) {
  const create = useCreateTerm()
  const update = useUpdateTerm()
  const years = useAcademicYearOptions()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? 'Edit term' : 'Add term'}
      description="Terms split the year for exams and fees: First Term, Second Term…"
      schema={termSchema}
      defaultValues={termDefaults(record, { academicYear: defaultAcademicYear, nextSequence })}
      onSubmit={async (values) => {
        const input = toTermInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Term updated.' : 'Term added.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label="Academic year" required error={errors.academic_year?.message}>
            {(p) => (
              <Controller
                control={control}
                name="academic_year"
                render={({ field }) => (
                  <SelectControl {...p} value={field.value} onChange={field.onChange} loading={years.isPending} options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.is_current ? `${y.name} (current)` : y.name }))} />
                )}
              />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="First Term" autoFocus />
            </FormField>
            <FormField label="Order" required error={errors.sequence?.message} description="1 for the first term.">
              <Input {...register('sequence')} inputMode="numeric" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Starts" required error={errors.start_date?.message}>
              {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
            </FormField>
            <FormField label="Ends" required error={errors.end_date?.message}>
              {(p) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
            </FormField>
          </div>
        </>
      )}
    </FormDialog>
  )
}
