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
import { tr } from '@/lib/i18n'

export function ProgramFormDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: Program | null }) {
  const create = useCreateProgram()
  const update = useUpdateProgram()
  const departments = useDepartmentOptions()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? tr('Edit program') : tr('Add program')}
      description={tr('A course of study with levels, e.g. "+2 Science" running Grade 11 to Grade 12.')}
      schema={programSchema}
      defaultValues={programDefaults(record)}
      onSubmit={async (values) => {
        const input = toProgramInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Program updated.') : tr('Program added.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label={tr('Code')} required error={errors.code?.message}>
              <Input {...register('code')} placeholder="SCI" autoFocus />
            </FormField>
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('+2 Science')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('Levels are')} error={errors.level_type?.message}>
              {(p) => (
                <Controller control={control} name="level_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('LevelTypeEnum')} />} />
              )}
            </FormField>
            <FormField label={tr('First level')} required error={errors.first_level?.message}>
              <Input {...register('first_level')} inputMode="numeric" />
            </FormField>
            <FormField label={tr('Last level')} required error={errors.last_level?.message}>
              <Input {...register('last_level')} inputMode="numeric" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Roll call')} error={errors.attendance_mode?.message} description={tr('Schools usually take one a day; colleges take it every lesson.')}>
              {(p) => (
                <Controller control={control} name="attendance_mode" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('AttendanceModeEnum')} />} />
              )}
            </FormField>
            <FormField label={tr('Department')} error={errors.department?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={departments.data ?? []} loading={departments.isPending} allowEmpty />}
                />
              )}
            </FormField>
          </div>
          <FormField label={tr('Description')} error={errors.description?.message}>
            <Textarea {...register('description')} rows={2} />
          </FormField>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {tr('Accepting students (active)')}
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}
