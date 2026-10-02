import { Controller } from 'react-hook-form'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { enumOptions } from '@/lib/formatters'
import { useDepartmentOptions } from '../../departments/hooks/useDepartments'
import type { Program } from '../api/programs.api'
import { useCreateProgram, useUpdateProgram } from '../hooks/usePrograms'
import { programDefaults, programSchema, toProgramInput } from '../schemas/program.schema'

export function ProgramFormDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: Program | null }) {
  const create = useCreateProgram()
  const update = useUpdateProgram()
  const departments = useDepartmentOptions()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? 'Edit program' : 'Add program'}
      description='A course of study with levels, e.g. "+2 Science" running Grade 11 to Grade 12.'
      schema={programSchema}
      defaultValues={programDefaults(record)}
      onSubmit={async (values) => {
        const input = toProgramInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Program updated.' : 'Program added.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} placeholder="SCI" autoFocus />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="+2 Science" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Levels are" error={errors.level_type?.message}>
              {(p) => (
                <Controller control={control} name="level_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('LevelTypeEnum')} />} />
              )}
            </FormField>
            <FormField label="First level" required error={errors.first_level?.message}>
              <Input {...register('first_level')} inputMode="numeric" />
            </FormField>
            <FormField label="Last level" required error={errors.last_level?.message}>
              <Input {...register('last_level')} inputMode="numeric" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Roll call" error={errors.attendance_mode?.message} description="Schools usually take one a day; colleges take it every lesson.">
              {(p) => (
                <Controller control={control} name="attendance_mode" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('AttendanceModeEnum')} />} />
              )}
            </FormField>
            <FormField label="Department" error={errors.department?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={departments.data ?? []} loading={departments.isPending} allowEmpty />}
                />
              )}
            </FormField>
          </div>
          <FormField label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} rows={2} />
          </FormField>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                Accepting students (active)
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}
