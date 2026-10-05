import { Controller, useWatch, type Control } from 'react-hook-form'
import { useBranches } from '@/app/providers/BranchProvider'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/useToast'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { useAcademicYearOptions, useCurrentAcademicYear } from '../../academic-years/hooks/useAcademicYears'
import { levelLabel, programLevels } from '../../programs/api/programs.api'
import { useProgramOptions } from '../../programs/hooks/usePrograms'
import { useRoomOptions } from '../../rooms/hooks/useRooms'
import type { SchoolClass } from '../api/classes.api'
import { useCreateClass, useUpdateClass } from '../hooks/useClasses'
import { classDefaults, classSchema, toClassInput, type ClassForm } from '../schemas/class.schema'
import { tr } from '@/lib/i18n'

/** Fields whose choices depend on the program and branch picked above them. */
function DependentFields({ control, errors }: { control: Control<ClassForm>; errors: Partial<Record<keyof ClassForm, { message?: string }>> }) {
  const [programId, campusId] = useWatch({ control, name: ['program', 'campus'] })
  const programs = useProgramOptions()
  const program = programs.data?.find((p) => String(p.id) === programId)
  const staff = useStaffOptions(campusId ? Number(campusId) : null)
  const rooms = useRoomOptions(campusId ? Number(campusId) : null)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <FormField label={tr('Program')} required error={errors.program?.message}>
          {(p) => (
            <Controller
              control={control}
              name="program"
              render={({ field }) => (
                <SelectControl {...p} value={field.value} onChange={field.onChange} loading={programs.isPending} options={(programs.data ?? []).map((pr) => ({ value: String(pr.id), label: pr.name }))} />
              )}
            />
          )}
        </FormField>
        <FormField label={tr('Level')} required error={errors.level?.message}>
          {(p) => (
            <Controller
              control={control}
              name="level"
              render={({ field }) => (
                <SelectControl
                  {...p}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!program}
                  placeholder={program ? tr('Choose…') : tr('Program first')}
                  options={programLevels(program).map((l) => ({ value: String(l), label: levelLabel(program, l) }))}
                />
              )}
            />
          )}
        </FormField>
        <FormField label={tr('Name')} required error={errors.name?.message}>
          {(p) => <Controller control={control} name="name" render={({ field }) => <Input {...p} {...field} placeholder="A" />} />}
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {staff.canPick && (
          <FormField label={tr('Class teacher')} error={errors.class_teacher?.message}>
            {(p) => (
              <Controller
                control={control}
                name="class_teacher"
                render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} allowEmpty emptyLabel={tr('Not yet assigned')} />}
              />
            )}
          </FormField>
        )}
        <FormField label={tr('Home room')} error={errors.home_room?.message}>
          {(p) => (
            <Controller
              control={control}
              name="home_room"
              render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={rooms.data ?? []} loading={rooms.isPending} allowEmpty />}
            />
          )}
        </FormField>
      </div>
    </>
  )
}

export function ClassFormDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: SchoolClass | null }) {
  const create = useCreateClass()
  const update = useUpdateClass()
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const { isMultiBranch, branches, defaultBranchId } = useBranches()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? tr('Edit {display_name}', { display_name: record.display_name }) : tr('Add class')}
      description={tr('A class is one group of students at one level, e.g. Grade 11 A.')}
      schema={classSchema}
      defaultValues={classDefaults(record, { academicYear: current.data?.id ?? null, campus: defaultBranchId })}
      onSubmit={async (values) => {
        const input = toClassInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Class updated.') : tr('Class added.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Academic year')} required error={errors.academic_year?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="academic_year"
                  render={({ field }) => (
                    <SelectControl {...p} value={field.value} onChange={field.onChange} loading={years.isPending} options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.is_current ? tr('{name} (current)', { name: y.name }) : y.name }))} />
                  )}
                />
              )}
            </FormField>
            {isMultiBranch && (
              <FormField label={tr('Branch')} required error={errors.campus?.message}>
                {(p) => (
                  <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />
                )}
              </FormField>
            )}
          </div>
          {!isMultiBranch && errors.campus && <p className="text-sm text-danger">{errors.campus.message}</p>}
          <DependentFields control={control} errors={errors} />
          <FormField label={tr('Seats')} error={errors.capacity?.message} description={tr('Leave empty for no limit.')} className="sm:max-w-40">
            <Input {...register('capacity')} inputMode="numeric" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
