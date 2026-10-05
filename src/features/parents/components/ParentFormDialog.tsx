import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import type { Parent } from '../api/parents.api'
import { useCreateParent, useUpdateParent } from '../hooks/useParents'
import { parentDefaults, parentSchema, toParentInput } from '../schemas/parent.schema'
import { tr } from '@/lib/i18n'

export function ParentFormDialog({
  open,
  onOpenChange,
  record,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  record: Parent | null
  onCreated?: (p: Parent) => void
}) {
  const create = useCreateParent()
  const update = useUpdateParent()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? tr('Edit {full_name}', { full_name: record.full_name }) : tr('Add parent')}
      description={record ? undefined : tr('A parent or guardian. Link them to their children after saving.')}
      schema={parentSchema}
      defaultValues={parentDefaults(record)}
      onSubmit={async (values) => {
        if (record) {
          await update.mutateAsync({ id: record.id, input: toParentInput(values) })
          toast.success(tr('Parent updated.'))
        } else {
          const created = await create.mutateAsync(toParentInput(values))
          toast.success(tr('{full_name} added.', { full_name: created.full_name }))
          onCreated?.(created)
        }
      }}
    >
      {({ register, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('First name')} required error={errors.first_name?.message}>
              <Input {...register('first_name')} autoComplete="off" autoFocus />
            </FormField>
            <FormField label={tr('Middle name')} error={errors.middle_name?.message}>
              <Input {...register('middle_name')} autoComplete="off" />
            </FormField>
            <FormField label={tr('Last name')} error={errors.last_name?.message}>
              <Input {...register('last_name')} autoComplete="off" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('Phone')} error={errors.phone?.message} description={tr('The school calls this number first.')}>
              <Input {...register('phone')} type="tel" inputMode="tel" />
            </FormField>
            <FormField label={tr('Email')} error={errors.email?.message}>
              <Input {...register('email')} type="email" />
            </FormField>
            <FormField label={tr('Occupation')} error={errors.occupation?.message}>
              <Input {...register('occupation')} />
            </FormField>
          </div>
          <FormField label={tr('Address')} error={errors.address?.message}>
            <Textarea {...register('address')} rows={2} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
