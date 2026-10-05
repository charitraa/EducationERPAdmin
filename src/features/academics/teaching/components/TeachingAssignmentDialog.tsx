import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { toast } from '@/hooks/useToast'
import { enumOptions } from '@/lib/formatters'
import { optionalWholeNumber, requiredId, toNullableInt } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, Schema } from '@/shared/types/api'
import { useClasses } from '../../classes/hooks/useClasses'
import { useProgramCurriculum } from '../../curriculum/hooks/useCurriculum'
import type { TeachingAssignment } from '../api/teaching.api'
import { useCreateTeachingAssignment, useUpdateTeachingAssignment } from '../hooks/useTeaching'
import { tr } from '@/lib/i18n'

const schema = z.object({
  section: requiredId(tr('Choose a class.')),
  subject: requiredId(tr('Choose a subject.')),
  teacher: requiredId(tr('Choose a teacher.')),
  role: z.enum(['lecture', 'practical', 'tutorial', 'co_teaching']),
  periods_per_week: optionalWholeNumber,
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

/** Subjects come from the class's curriculum (program + level): the backend refuses anything else. */
function ClassAndSubject({ control, errors, academicYear, locked }: { control: Control<Form>; errors: FieldErrors<Form>; academicYear?: Id; locked: boolean }) {
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: academicYear, ordering: 'level' })
  const sectionId = useWatch({ control, name: 'section' })
  const section = classes.data?.results.find((c) => String(c.id) === sectionId)
  const curriculum = useProgramCurriculum(section?.program ?? null)
  const subjects = (curriculum.data?.results ?? []).filter((c) => c.level === section?.level)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label={tr('Class')} required error={errors.section?.message}>
        {(p) => (
          <Controller
            control={control}
            name="section"
            render={({ field }) => (
              <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={locked} loading={classes.isPending} options={(classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: `${c.display_name} · ${c.program_name}` }))} />
            )}
          />
        )}
      </FormField>
      <FormField
        label={tr('Subject')}
        required
        error={errors.subject?.message}
        description={section && curriculum.data && subjects.length === 0 ? tr('No subjects in the curriculum for {display_name} yet. Add them under Curriculum.', { display_name: section.display_name }) : undefined}
      >
        {(p) => (
          <Controller
            control={control}
            name="subject"
            render={({ field }) => (
              <SelectControl
                {...p}
                value={field.value}
                onChange={field.onChange}
                disabled={locked || !section}
                loading={Boolean(section) && curriculum.isPending}
                placeholder={section ? tr('Choose…') : tr('Choose a class first')}
                options={subjects.map((c) => ({ value: String(c.subject), label: `${c.subject_name}${c.is_elective ? ' (elective)' : ''}` }))}
              />
            )}
          />
        )}
      </FormField>
    </div>
  )
}

export function TeachingAssignmentDialog({ open, onOpenChange, record, academicYear }: { open: boolean; onOpenChange: (o: boolean) => void; record: TeachingAssignment | null; academicYear?: Id }) {
  const create = useCreateTeachingAssignment()
  const update = useUpdateTeachingAssignment()
  const staff = useStaffOptions()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? `${record.subject_name} · ${record.section_name}` : tr('Assign a teacher')}
      description={tr('Who teaches which subject to which class. Timetable lessons and lesson attendance are built on this.')}
      schema={schema}
      defaultValues={{
        section: record ? String(record.section) : '',
        subject: record ? String(record.subject) : '',
        teacher: record ? String(record.teacher) : '',
        role: (record?.role as Form['role']) ?? 'lecture',
        periods_per_week: record?.periods_per_week != null ? String(record.periods_per_week) : '',
        is_active: record?.is_active ?? true,
      }}
      onSubmit={async (v) => {
        const input = {
          section: Number(v.section),
          subject: Number(v.subject),
          teacher: Number(v.teacher),
          role: v.role as Schema<'TeachingAssignmentRoleEnum'>,
          periods_per_week: toNullableInt(v.periods_per_week),
          is_active: v.is_active,
        }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Saved.') : tr('Teacher assigned.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <ClassAndSubject control={control} errors={errors} academicYear={academicYear} locked={record != null} />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('Teacher')} required error={errors.teacher?.message} className="sm:col-span-1">
              {(p) => <Controller control={control} name="teacher" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} loading={staff.isPending} options={staff.data ?? []} />} />}
            </FormField>
            <FormField label={tr('Teaches')} error={errors.role?.message}>
              {(p) => <Controller control={control} name="role" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('TeachingAssignmentRoleEnum')} />} />}
            </FormField>
            <FormField label={tr('Periods a week')} error={errors.periods_per_week?.message} description={tr('Used by the timetable generator.')}>
              <Input {...register('periods_per_week')} inputMode="numeric" />
            </FormField>
          </div>
          {record && (
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Active')}
                </label>
              )}
            />
          )}
        </>
      )}
    </FormDialog>
  )
}
