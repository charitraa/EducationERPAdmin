import { Controller } from 'react-hook-form'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import type { Campus } from '@/shared/types/organization'
import { useCreateBranch, useUpdateBranch } from '../hooks/useBranchResource'
import { branchDefaults, branchSchema, toBranchInput } from '../schemas/branch.schema'

export function BranchFormDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: Campus | null }) {
  const create = useCreateBranch()
  const update = useUpdateBranch()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? `Edit ${record.name}` : 'Add a branch'}
      description={record ? undefined : 'Once you have two branches, branch choices appear across the ERP.'}
      schema={branchSchema}
      defaultValues={branchDefaults(record)}
      onSubmit={async (values) => {
        const input = toBranchInput(values)
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Branch updated.' : 'Branch added.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Kathmandu" autoFocus />
            </FormField>
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} placeholder="KTM" />
            </FormField>
          </div>
          <FormField label="Address" error={errors.address?.message}>
            <Textarea {...register('address')} rows={2} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="City" error={errors.city?.message}>
              <Input {...register('city')} />
            </FormField>
            <FormField label="Province" error={errors.state?.message}>
              <Input {...register('state')} />
            </FormField>
            <FormField label="Country" error={errors.country?.message}>
              <Input {...register('country')} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone" error={errors.phone?.message}>
              <Input {...register('phone')} type="tel" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <Input {...register('email')} type="email" />
            </FormField>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
            <Controller
              control={control}
              name="is_main"
              render={({ field }) => (
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> Main branch
                </label>
              )}
            />
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> Open (active)
                </label>
              )}
            />
          </div>
        </>
      )}
    </FormDialog>
  )
}
