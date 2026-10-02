import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSection } from '@/components/forms/FormSection'
import { SelectControl } from '@/components/forms/SelectControl'
import { UnsavedChangesDialog } from '@/components/forms/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { applyServerErrors } from '@/lib/errors'
import { enumOptions } from '@/lib/formatters'
import type { StaffMember } from '../api/staff.api'
import { useCreateStaff, useStaffMember, useUpdateStaff } from '../hooks/useStaff'
import { STAFF_FIELDS, staffDefaults, staffSchema, toStaffInput, type StaffForm } from '../schemas/staff.schema'

/** /staff/new and /staff/:id/edit */
export default function StaffFormPage() {
  const { id } = useParams()
  const staffId = id ? Number(id) : null
  const member = useStaffMember(staffId)
  if (staffId == null) return <StaffFormBody record={null} />
  if (member.isPending) return <PageLoader />
  if (member.isError) return <ErrorState error={member.error} onRetry={() => void member.refetch()} />
  return <StaffFormBody record={member.data} />
}

function StaffFormBody({ record }: { record: StaffMember | null }) {
  const navigate = useNavigate()
  const { isMultiBranch, branches, defaultBranchId, branchName } = useBranches()
  const create = useCreateStaff()
  const update = useUpdateStaff()
  const [serverError, setServerError] = useState<string | null>(null)
  const [savedTo, setSavedTo] = useState<string | null>(null)
  const form = useForm<StaffForm>({ resolver: zodResolver(staffSchema), defaultValues: staffDefaults(record, defaultBranchId) })
  const { register, control, formState } = form
  const { errors } = formState
  const blocker = useUnsavedChanges(formState.isDirty && !savedTo)
  const cancelTo = record ? `/staff/${record.id}` : '/staff'

  useEffect(() => {
    if (!record && defaultBranchId && !form.getValues('campus')) form.setValue('campus', String(defaultBranchId))
  }, [record, defaultBranchId, form])

  useEffect(() => {
    if (savedTo) navigate(savedTo)
  }, [savedTo, navigate])

  const submit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      const input = toStaffInput(values)
      const saved = record ? await update.mutateAsync({ id: record.id, input }) : await create.mutateAsync(input)
      toast.success(record ? 'Details saved.' : `${saved.full_name} added to staff.`)
      setSavedTo(`/staff/${saved.id}`)
    } catch (err) {
      setServerError(applyServerErrors(err, form.setError, STAFF_FIELDS))
    }
  })

  return (
    <>
      <PageHeader
        title={record ? `Edit ${record.full_name}` : 'Add staff member'}
        description={record ? `Employee no. ${record.employee_number}` : 'Teachers and everyone else who works at the school.'}
        backTo={cancelTo}
      />
      <form onSubmit={submit} noValidate className="max-w-4xl">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <FormError message={serverError} className="mb-4" />
          <FormSection title="Profile">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="First name" required error={errors.first_name?.message}>
                <Input {...register('first_name')} autoComplete="off" autoFocus={!record} />
              </FormField>
              <FormField label="Middle name" error={errors.middle_name?.message}>
                <Input {...register('middle_name')} autoComplete="off" />
              </FormField>
              <FormField label="Last name" required error={errors.last_name?.message}>
                <Input {...register('last_name')} autoComplete="off" />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Date of birth (AD)" error={errors.date_of_birth?.message}>
                {(p) => <Controller control={control} name="date_of_birth" render={({ field }) => <DatePicker {...p} {...field} />} />}
              </FormField>
              <FormField label="Gender" error={errors.gender?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('GenderEnum')} allowEmpty emptyLabel="Not recorded" />}
                  />
                )}
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Phone" error={errors.phone?.message}>
                <Input {...register('phone')} type="tel" inputMode="tel" />
              </FormField>
              <FormField label="Email" error={errors.email?.message}>
                <Input {...register('email')} type="email" />
              </FormField>
            </div>
            <FormField label="Address" error={errors.address?.message}>
              <Textarea {...register('address')} rows={2} />
            </FormField>
          </FormSection>

          <FormSection title="Employment" description="Teaching staff can be class teachers and appear in the timetable.">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Employee no." required error={errors.employee_number?.message} description="Unique in your school.">
                <Input {...register('employee_number')} className="font-mono" />
              </FormField>
              <FormField label="Type" error={errors.staff_type?.message}>
                {(p) => (
                  <Controller control={control} name="staff_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('StaffTypeEnum')} />} />
                )}
              </FormField>
              <FormField label="Designation" error={errors.designation?.message}>
                <Input {...register('designation')} placeholder="Teacher, HOD, Accountant…" />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Joined on (AD)" error={errors.joined_on?.message}>
                {(p) => <Controller control={control} name="joined_on" render={({ field }) => <DatePicker {...p} {...field} />} />}
              </FormField>
              {isMultiBranch && (
                <FormField label="Branch" required error={errors.campus?.message}>
                  {(p) => (
                    <Controller
                      control={control}
                      name="campus"
                      render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />}
                    />
                  )}
                </FormField>
              )}
            </div>
            {!isMultiBranch && errors.campus && (
              <p className="text-sm text-danger">
                {errors.campus.message} {defaultBranchId ? `(${branchName(defaultBranchId)})` : 'Your account can’t see any branch; ask an administrator.'}
              </p>
            )}
          </FormSection>
        </div>
        <div className="sticky bottom-16 mt-4 flex justify-end gap-2 md:bottom-4">
          <Button type="button" variant="outline" onClick={() => navigate(cancelTo)}>
            Cancel
          </Button>
          <Button type="submit" disabled={formState.isSubmitting || (record != null && !formState.isDirty)}>
            {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            {record ? 'Save changes' : 'Add staff member'}
          </Button>
        </div>
      </form>
      <UnsavedChangesDialog blocker={blocker} />
    </>
  )
}
