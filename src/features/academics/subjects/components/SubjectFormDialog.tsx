import { Controller } from 'react-hook-form'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { useDepartmentOptions } from '../../departments/hooks/useDepartments'
import type { Subject } from '../api/subjects.api'
import { useCreateSubject, useUpdateSubject } from '../hooks/useSubjects'
import { subjectDefaults, subjectSchema, toSubjectInput } from '../schemas/subject.schema'

export function SubjectFormDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: Subject | null }) {
  const create = useCreateSubject()
  const update = useUpdateSubject()
  const departments = useDepartmentOptions()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? 'Edit subject' : 'Add subject'}
      schema={subjectSchema}
      defaultValues={subjectDefaults(record)}
      onSubmit={async (values) => {
        const input = toSubjectInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Subject updated.' : 'Subject added.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} placeholder="PHY" autoFocus />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Physics" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Credit hours" error={errors.credit_hours?.message} description="Leave empty if you don't use credits.">
              <Input {...register('credit_hours')} inputMode="decimal" placeholder="4" />
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
        </>
      )}
    </FormDialog>
  )
}
