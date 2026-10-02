import { Controller, type UseFormReturn } from 'react-hook-form'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { enumOptions } from '@/lib/formatters'
import type { OrganizationForm } from '../schemas/organization.schema'

/** School details fields, shared by Settings → Organization and setup step 1. */
export function OrganizationFields({ form, compact }: { form: UseFormReturn<OrganizationForm>; compact?: boolean }) {
  const {
    register,
    control,
    formState: { errors },
  } = form
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <FormField label="School name" required error={errors.name?.message} description="Shown to staff, students and parents.">
          <Input {...register('name')} />
        </FormField>
        <FormField label="Type" error={errors.type?.message}>
          {(p) => <Controller control={control} name="type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('TypeEnum')} />} />}
        </FormField>
      </div>
      {!compact && (
        <FormField label="Legal name" error={errors.legal_name?.message} description="If different, for receipts and certificates.">
          <Input {...register('legal_name')} />
        </FormField>
      )}
      <FormField label="Address" error={errors.address?.message}>
        <Textarea {...register('address')} rows={2} placeholder="Street, municipality, district" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone" error={errors.phone?.message}>
          <Input {...register('phone')} type="tel" autoComplete="tel" />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <Input {...register('email')} type="email" autoComplete="email" />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Website" error={errors.website?.message}>
          <Input {...register('website')} type="url" placeholder="https://" />
        </FormField>
        {!compact && (
          <FormField label="Time zone" error={errors.timezone?.message} description="Decides what 'today' means for attendance.">
            <Input {...register('timezone')} placeholder="Asia/Kathmandu" />
          </FormField>
        )}
      </div>
    </div>
  )
}
