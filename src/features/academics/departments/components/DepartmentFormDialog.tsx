import { Controller } from 'react-hook-form'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import type { Department } from '../api/departments.api'
import { useCreateDepartment, useUpdateDepartment } from '../hooks/useDepartments'
import { departmentDefaults, departmentSchema, toDepartmentInput } from '../schemas/department.schema'
import { tr } from '@/lib/i18n'

export function DepartmentFormDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: Department | null }) {
  const create = useCreateDepartment()
  const update = useUpdateDepartment()
  const staff = useStaffOptions()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit department') : tr('Add department')}
      schema={departmentSchema}
      defaultValues={departmentDefaults(record)}
      onSubmit={async (values) => {
        const input = toDepartmentInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Department updated.') : tr('Department added.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label={tr('Code')} required error={errors.code?.message}>
              <Input {...register('code')} placeholder="SCI" autoFocus />
            </FormField>
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('Science')} />
            </FormField>
          </div>
          {staff.canPick && (
            <FormField label={tr('Head of department')} error={errors.head?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="head"
                  render={({ field }) => (
                    <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} allowEmpty emptyLabel={tr('No head')} />
                  )}
                />
              )}
            </FormField>
          )}
          <FormField label={tr('Description')} error={errors.description?.message}>
            <Textarea {...register('description')} rows={3} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
