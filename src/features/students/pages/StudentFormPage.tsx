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
import { formatDate } from '@/lib/dates'
import { applyServerErrors } from '@/lib/errors'
import { enumOptions } from '@/lib/formatters'
import type { Student } from '../api/students.api'
import { useCreateStudent, useStudent, useUpdateStudent } from '../hooks/useStudents'
import { STUDENT_FIELDS, studentDefaults, studentSchema, toStudentInput, type StudentForm } from '../schemas/student.schema'
import { tr } from '@/lib/i18n'

/** /students/new and /students/:id/edit */
export default function StudentFormPage() {
  const { id } = useParams()
  const studentId = id ? Number(id) : null
  const student = useStudent(studentId)
  if (studentId == null) return <StudentFormBody record={null} />
  if (student.isPending) return <PageLoader />
  if (student.isError) return <ErrorState error={student.error} onRetry={() => void student.refetch()} />
  return <StudentFormBody record={student.data} />
}

function StudentFormBody({ record }: { record: Student | null }) {
  const navigate = useNavigate()
  const { isMultiBranch, branches, defaultBranchId, branchName } = useBranches()
  const create = useCreateStudent()
  const update = useUpdateStudent()
  const [serverError, setServerError] = useState<string | null>(null)
  const [savedTo, setSavedTo] = useState<string | null>(null)
  const form = useForm<StudentForm>({ resolver: zodResolver(studentSchema), defaultValues: studentDefaults(record, defaultBranchId) })
  const { register, control, formState } = form
  const { errors } = formState
  const blocker = useUnsavedChanges(formState.isDirty && !savedTo)
  const cancelTo = record ? `/students/${record.id}` : '/students'

  // Branches load after the page on a cold start; fill the silent default once they do.
  useEffect(() => {
    if (!record && defaultBranchId && !form.getValues('campus')) form.setValue('campus', String(defaultBranchId))
  }, [record, defaultBranchId, form])

  useEffect(() => {
    if (savedTo) navigate(savedTo)
  }, [savedTo, navigate])

  const submit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      const input = toStudentInput(values, !record)
      const saved = record ? await update.mutateAsync({ id: record.id, input }) : await create.mutateAsync(input)
      toast.success(record ? tr('Student details saved.') : tr('{full_name} added. Place them in a class next.', { full_name: saved.full_name }))
      setSavedTo(`/students/${saved.id}`)
    } catch (err) {
      setServerError(applyServerErrors(err, form.setError, STUDENT_FIELDS))
    }
  })

  return (
    <>
      <PageHeader
        title={record ? tr('Edit {full_name}', { full_name: record.full_name }) : tr('Add student')}
        description={record ? tr('Student no. {student_number}', { student_number: record.student_number }) : tr('The student is enrolled from the admission date. You can place them in a class after saving.')}
        backTo={cancelTo}
      />
      <form onSubmit={submit} noValidate className="max-w-4xl">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <FormError message={serverError} className="mb-4" />
          <FormSection title={tr('Identity')} description={tr('As written on the admission form.')}>
            <FormField label={tr('Student no.')} required error={errors.student_number?.message} description={tr('Admission or registration number. Unique in your school.')} className="sm:max-w-xs">
              <Input {...register('student_number')} autoFocus={!record} className="font-mono" />
            </FormField>
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
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </FormSection>

          <FormSection title={tr('Contact')} description={tr("The student's own. Guardians are added under Parents.")}>
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
          </FormSection>

          <FormSection title={tr('Enrollment')} description={record ? tr('Set when the student was added.') : undefined}>
            {record ? (
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {isMultiBranch && (
                  <div>
                    <dt className="text-muted-foreground">{tr('Branch')}</dt>
                    <dd className="font-medium">{record.campus_name}</dd>
                    <dd className="text-xs text-muted-foreground">{tr("Use Transfer on the student's page to move them.")}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">{tr('Admitted on')}</dt>
                  <dd className="font-medium tabular-nums">{formatDate(record.admitted_on)}</dd>
                </div>
              </dl>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {isMultiBranch && (
                  <FormField label={tr('Branch')} required error={errors.campus?.message}>
                    {(p) => (
                      <Controller
                        control={control}
                        name="campus"
                        render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />}
                      />
                    )}
                  </FormField>
                )}
                <FormField label={tr('Admitted on (AD)')} error={errors.admitted_on?.message} description={tr('Leave empty for today.')}>
                  {(p) => <Controller control={control} name="admitted_on" render={({ field }) => <DatePicker {...p} {...field} />} />}
                </FormField>
              </div>
            )}
            {!isMultiBranch && errors.campus && (
              <p className="text-sm text-danger">
                {errors.campus.message} {defaultBranchId ? `(${branchName(defaultBranchId)})` : tr('Your account can’t see any branch; ask an administrator.')}
              </p>
            )}
          </FormSection>
        </div>
        <div className="sticky bottom-16 mt-4 flex justify-end gap-2 md:bottom-4">
          <Button type="button" variant="outline" onClick={() => navigate(cancelTo)}>
            {tr('Cancel')}
          </Button>
          <Button type="submit" disabled={formState.isSubmitting || (record != null && !formState.isDirty)}>
            {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            {record ? tr('Save changes') : tr('Add student')}
          </Button>
        </div>
      </form>
      <UnsavedChangesDialog blocker={blocker} />
    </>
  )
}
