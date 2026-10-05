import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/useToast'
import { optionalIsoDate } from '@/lib/validation'
import { ApiError, toApiError } from '@/shared/api/errors'
import type { Admission } from '../api/admissions.api'
import { useEnrollAdmission } from '../hooks/useAdmissions'
import { tr } from '@/lib/i18n'

const schema = z.object({ student_number: z.string().trim().min(1, tr('Required.')).max(32), started_on: optionalIsoDate })

/** Approved → enrolled: creates the student, and the guardian as a linked parent. All or nothing. */
export function EnrollDialog({ admission, open, onOpenChange }: { admission: Admission; open: boolean; onOpenChange: (o: boolean) => void }) {
  const enroll = useEnrollAdmission()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Enroll {full_name}', { full_name: admission.full_name })}
      description={
        admission.guardian_first_name
          ? tr('Creates their student record, and adds {guardian_first_name} {guardian_last_name} as their parent.', { guardian_first_name: admission.guardian_first_name, guardian_last_name: admission.guardian_last_name })
          : tr('Creates their student record from this application.')
      }
      submitLabel={tr('Enroll')}
      schema={schema}
      defaultValues={{ student_number: '', started_on: '' }}
      onSubmit={async (v) => {
        try {
          await enroll.mutateAsync({ id: admission.id, input: { student_number: v.student_number, ...(v.started_on ? { started_on: v.started_on } : {}) } })
        } catch (err) {
          // The backend reports a taken number as a raw database constraint; say it on the field instead.
          const e = toApiError(err)
          if (e.generalErrors.some((m) => m.includes('uniq_student_number'))) {
            throw new ApiError({ code: 'invalid', message: '', details: { student_number: [tr('This student number is already in use.')] } }, 400)
          }
          throw err
        }
        toast.success(tr('{full_name} enrolled. Place them in a class from their student record.', { full_name: admission.full_name }))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={tr('Student no.')} required error={errors.student_number?.message} description={tr('Their admission or registration number.')}>
            <Input {...register('student_number')} className="font-mono" autoFocus />
          </FormField>
          <FormField label={tr('First day (AD)')} error={errors.started_on?.message} description={tr('Empty for today.')}>
            {(p) => <Controller control={control} name="started_on" render={({ field }) => <DatePicker {...p} {...field} />} />}
          </FormField>
        </div>
      )}
    </FormDialog>
  )
}
