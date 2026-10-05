import { useEffect, useState } from 'react'
import { Controller, useController, useWatch, type Control, type FieldErrors } from 'react-hook-form'
import { z } from 'zod'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { useAcademicYearOptions, useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { toast } from '@/hooks/useToast'
import { pluralize } from '@/lib/formatters'
import { optionalIsoDate, requiredId } from '@/lib/validation'
import { toApiError } from '@/shared/api/errors'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { currentEnrollment, type Student } from '../api/students.api'
import { usePlaceStudent } from '../hooks/useStudents'
import { tr } from '@/lib/i18n'

const schema = z.object({
  /** Only narrows the class list; not sent. */
  academic_year: z.string(),
  section: requiredId(tr('Choose a class.')),
  on_date: optionalIsoDate,
  reason: z.string().trim().max(255),
  allow_over_capacity: z.boolean(),
})
type PlaceForm = z.infer<typeof schema>

function ClassPicker({ control, errors, campus, currentSection }: { control: Control<PlaceForm>; errors: FieldErrors<PlaceForm>; campus: number; currentSection: number | null }) {
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const year = useWatch({ control, name: 'academic_year' })
  const { field: yearField } = useController({ control, name: 'academic_year' })
  // Years still loading when the dialog opened: fill in the same default once they arrive.
  const fallbackYear = current.data?.id ?? years.data?.[0]?.id
  useEffect(() => {
    if (!year && fallbackYear) yearField.onChange(String(fallbackYear))
  }, [year, fallbackYear, yearField])
  const classes = useClasses({ ...PICKER_PARAMS, campus, academic_year: year || undefined, ordering: 'level' }, { enabled: Boolean(year) })
  const options = (classes.data?.results ?? [])
    .filter((c) => c.id !== currentSection)
    .map((c) => {
      const full = c.capacity != null && c.student_count >= c.capacity
      const seats = c.capacity != null ? ` · ${c.student_count}/${c.capacity}${full ? ' ' + tr('full') : ''}` : ` · ${pluralize(c.student_count, 'student')}`
      return { value: String(c.id), label: `${c.display_name}${seats}` }
    })

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr]">
      <FormField label={tr('Academic year')} error={errors.academic_year?.message}>
        {(p) => (
          <Controller
            control={control}
            name="academic_year"
            render={({ field }) => (
              <SelectControl
                {...p}
                value={field.value}
                onChange={field.onChange}
                loading={years.isPending}
                options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.is_current ? tr('{name} (current)', { name: y.name }) : y.name }))}
              />
            )}
          />
        )}
      </FormField>
      <FormField label={tr('Class')} required error={errors.section?.message} description={
          years.data?.length === 0
            ? tr('No academic years yet. Add one under Academics first.')
            : year && classes.data && options.length === 0
              ? tr('No other classes at this branch in that year.')
              : undefined
        }>
        {(p) => (
          <Controller
            control={control}
            name="section"
            render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={options} loading={Boolean(year) && classes.isPending} disabled={!year} />}
          />
        )}
      </FormField>
    </div>
  )
}

/**
 * First placement fills in the student's open enrollment; any later one is a
 * move (promotion, new year, section change) and can take effect on a later date.
 */
export function PlaceStudentDialog({ student, open, onOpenChange }: { student: Student; open: boolean; onOpenChange: (o: boolean) => void }) {
  const place = usePlaceStudent()
  // Loaded with the page so the dialog opens with the year already chosen.
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const defaultYear = current.data?.id ?? years.data?.[0]?.id
  const [overCapacity, setOverCapacity] = useState(false)
  const enrollment = currentEnrollment(student)
  const isMove = enrollment?.section != null

  useEffect(() => {
    if (open) setOverCapacity(false)
  }, [open])

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={isMove ? tr('Move {full_name} to another class', { full_name: student.full_name }) : tr('Place {full_name} in a class', { full_name: student.full_name })}
      description={
        isMove
          ? tr('Now in {section_name}. Promotions and section changes keep the old class in their history.', { section_name: enrollment!.section_name })
          : tr('Attendance, marks and fees follow the class the student is in.')
      }
      submitLabel={isMove ? tr('Move') : tr('Place')}
      schema={schema}
      defaultValues={{ academic_year: defaultYear ? String(defaultYear) : '', section: '', on_date: '', reason: '', allow_over_capacity: false }}
      onSubmit={async (v) => {
        try {
          await place.mutateAsync({
            id: student.id,
            input: {
              section: Number(v.section),
              allow_over_capacity: v.allow_over_capacity,
              ...(isMove ? { reason: v.reason, ...(v.on_date ? { on_date: v.on_date } : {}) } : {}),
            },
          })
        } catch (err) {
          if (toApiError(err).code === 'over_capacity') setOverCapacity(true)
          throw err
        }
        toast.success(isMove ? tr('{full_name} moved.', { full_name: student.full_name }) : tr('{full_name} placed.', { full_name: student.full_name }))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <ClassPicker control={control} errors={errors} campus={student.campus} currentSection={enrollment?.section ?? null} />
          {isMove && (
            <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr]">
              <FormField label={tr('Takes effect (AD)')} error={errors.on_date?.message} description={tr('Leave empty for today. A later date keeps them in their class until then.')}>
                {(p) => <Controller control={control} name="on_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
              </FormField>
              <FormField label={tr('Reason')} error={errors.reason?.message}>
                <Textarea {...register('reason')} rows={2} maxLength={255} placeholder={tr('Promoted, section change…')} />
              </FormField>
            </div>
          )}
          {overCapacity && (
            <Controller
              control={control}
              name="allow_over_capacity"
              render={({ field }) => (
                <label className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} className="mt-0.5" />
                  <span>
                    <span className="font-medium">{tr('Place anyway, over the class’s seat limit')}</span>
                    <span className="block text-xs text-muted-foreground">{tr('The class will have more students than its capacity.')}</span>
                  </span>
                </label>
              )}
            />
          )}
        </>
      )}
    </FormDialog>
  )
}
