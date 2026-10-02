import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import type { Parent } from '../api/parents.api'
import { useCreateParent, useUpdateParent } from '../hooks/useParents'
import { parentDefaults, parentSchema, toParentInput } from '../schemas/parent.schema'

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
      title={record ? `Edit ${record.full_name}` : 'Add parent'}
      description={record ? undefined : 'A parent or guardian. Link them to their children after saving.'}
      schema={parentSchema}
      defaultValues={parentDefaults(record)}
      onSubmit={async (values) => {
        if (record) {
          await update.mutateAsync({ id: record.id, input: toParentInput(values) })
          toast.success('Parent updated.')
        } else {
          const created = await create.mutateAsync(toParentInput(values))
          toast.success(`${created.full_name} added.`)
          onCreated?.(created)
        }
      }}
    >
      {({ register, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="First name" required error={errors.first_name?.message}>
              <Input {...register('first_name')} autoComplete="off" autoFocus />
            </FormField>
            <FormField label="Middle name" error={errors.middle_name?.message}>
              <Input {...register('middle_name')} autoComplete="off" />
            </FormField>
            <FormField label="Last name" error={errors.last_name?.message}>
              <Input {...register('last_name')} autoComplete="off" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Phone" error={errors.phone?.message} description="The school calls this number first.">
              <Input {...register('phone')} type="tel" inputMode="tel" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <Input {...register('email')} type="email" />
            </FormField>
            <FormField label="Occupation" error={errors.occupation?.message}>
              <Input {...register('occupation')} />
            </FormField>
          </div>
          <FormField label="Address" error={errors.address?.message}>
            <Textarea {...register('address')} rows={2} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
