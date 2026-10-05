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
import { tr } from '@/lib/i18n'

export function SubjectFormDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: Subject | null }) {
  const create = useCreateSubject()
  const update = useUpdateSubject()
  const departments = useDepartmentOptions()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit subject') : tr('Add subject')}
      schema={subjectSchema}
      defaultValues={subjectDefaults(record)}
      onSubmit={async (values) => {
        const input = toSubjectInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Subject updated.') : tr('Subject added.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label={tr('Code')} required error={errors.code?.message}>
              <Input {...register('code')} placeholder="PHY" autoFocus />
            </FormField>
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('Physics')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Credit hours')} error={errors.credit_hours?.message} description={tr("Leave empty if you don't use credits.")}>
              <Input {...register('credit_hours')} inputMode="decimal" placeholder="4" />
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
        </>
      )}
    </FormDialog>
  )
}
