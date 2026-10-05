import { Controller } from 'react-hook-form'
import { useBranches } from '@/app/providers/BranchProvider'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { enumOptions } from '@/lib/formatters'
import type { Admission } from '../api/admissions.api'
import { useCreateAdmission, useUpdateAdmission } from '../hooks/useAdmissions'
import { admissionDefaults, admissionSchema, toAdmissionInput } from '../schemas/admission.schema'
import { tr } from '@/lib/i18n'

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  )
}

export function AdmissionFormDialog({
  open,
  onOpenChange,
  record,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  record: Admission | null
  onCreated?: (a: Admission) => void
}) {
  const create = useCreateAdmission()
  const update = useUpdateAdmission()
  const { isMultiBranch, branches, defaultBranchId } = useBranches()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? tr('Edit application {application_number}', { application_number: record.application_number }) : tr('Record an application')}
      description={record ? tr('Details can be changed until the application is decided.') : tr('An application received on paper or at the front desk. It starts as pending review.')}
      submitLabel={record ? tr('Save') : tr('Record application')}
      schema={admissionSchema}
      defaultValues={admissionDefaults(record, defaultBranchId)}
      onSubmit={async (values) => {
        const input = toAdmissionInput(values)
        if (record) {
          await update.mutateAsync({ id: record.id, input })
          toast.success(tr('Application updated.'))
        } else {
          const created = await create.mutateAsync(input)
          toast.success(tr('Application {application_number} recorded.', { application_number: created.application_number }))
          onCreated?.(created)
        }
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <Group title={tr('Application')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={tr('Application no.')} required error={errors.application_number?.message}>
                <Input {...register('application_number')} className="font-mono" autoFocus={!record} />
              </FormField>
              <FormField label={tr('Received on (AD)')} error={errors.applied_on?.message} description={record ? undefined : tr('Empty for today.')}>
                {(p) => <Controller control={control} name="applied_on" render={({ field }) => <DatePicker {...p} {...field} />} />}
              </FormField>
              <FormField label={tr('Applying for')} error={errors.applying_for?.message}>
                <Input {...register('applying_for')} placeholder={tr('Grade 11 Science')} />
              </FormField>
            </div>
            {isMultiBranch && (
              <FormField label={tr('Branch')} required error={errors.campus?.message} className="sm:max-w-xs">
                {(p) => (
                  <Controller
                    control={control}
                    name="campus"
                    render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />}
                  />
                )}
              </FormField>
            )}
            {!isMultiBranch && errors.campus && <p className="text-sm text-danger">{errors.campus.message}</p>}
          </Group>

          <Group title={tr('Applicant')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={tr('First name')} required error={errors.first_name?.message}>
                <Input {...register('first_name')} autoComplete="off" />
              </FormField>
              <FormField label={tr('Middle name')} error={errors.middle_name?.message}>
                <Input {...register('middle_name')} autoComplete="off" />
              </FormField>
              <FormField label={tr('Last name')} required error={errors.last_name?.message}>
                <Input {...register('last_name')} autoComplete="off" />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={tr('Date of birth (AD)')} error={errors.date_of_birth?.message}>
                {(p) => <Controller control={control} name="date_of_birth" render={({ field }) => <DatePicker {...p} {...field} />} />}
              </FormField>
              <FormField label={tr('Gender')} error={errors.gender?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('GenderEnum')} allowEmpty emptyLabel={tr('Not recorded')} />}
                  />
                )}
              </FormField>
              <FormField label={tr('Previous school')} error={errors.previous_school?.message}>
                <Input {...register('previous_school')} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('Phone')} error={errors.phone?.message}>
                <Input {...register('phone')} type="tel" inputMode="tel" />
              </FormField>
              <FormField label={tr('Email')} error={errors.email?.message}>
                <Input {...register('email')} type="email" />
              </FormField>
            </div>
            <FormField label={tr('Address')} error={errors.address?.message}>
              <Textarea {...register('address')} rows={2} />
            </FormField>
          </Group>

          <Group title={tr('Guardian')}>
            <p className="-mt-2 text-xs text-muted-foreground">{tr('On enrollment, the guardian is added under Parents and linked as the primary contact.')}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={tr('First name')} error={errors.guardian_first_name?.message}>
                <Input {...register('guardian_first_name')} autoComplete="off" />
              </FormField>
              <FormField label={tr('Last name')} error={errors.guardian_last_name?.message}>
                <Input {...register('guardian_last_name')} autoComplete="off" />
              </FormField>
              <FormField label={tr('Relationship')} error={errors.guardian_relationship?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="guardian_relationship"
                    render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('RelationshipEnum')} allowEmpty emptyLabel={tr('Not recorded')} />}
                  />
                )}
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('Guardian phone')} error={errors.guardian_phone?.message}>
                <Input {...register('guardian_phone')} type="tel" inputMode="tel" />
              </FormField>
              <FormField label={tr('Guardian email')} error={errors.guardian_email?.message}>
                <Input {...register('guardian_email')} type="email" />
              </FormField>
            </div>
          </Group>
        </>
      )}
    </FormDialog>
  )
}
