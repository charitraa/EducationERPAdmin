import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { optionalIsoDate } from '@/lib/validation'
import type { Student, StudentStatus } from '../api/students.api'
import { useChangeStudentStatus } from '../hooks/useStudents'
import { tr } from '@/lib/i18n'

const schema = z.object({ on_date: optionalIsoDate, reason: z.string().trim().max(255) })

/** What each target status does, in the words the dialog uses. Mirrors the backend's ALLOWED_TRANSITIONS. */
export const STATUS_CHANGES: Record<
  StudentStatus,
  { verb: string; from: readonly StudentStatus[]; explain: string; datesMatter: boolean; done: string }
> = {
  suspended: {
    verb: tr('Suspend'),
    from: ['active'],
    explain: tr('They keep their class and record. Reactivate them when the suspension ends.'),
    datesMatter: false,
    done: 'suspended',
  },
  active: {
    verb: tr('Reactivate'),
    from: ['suspended'],
    explain: tr('They return to their class as an active student.'),
    datesMatter: false,
    done: 'reactivated',
  },
  graduated: {
    verb: tr('Graduate'),
    from: ['active'],
    explain: tr('Their current class is closed as completed. This is final: graduated students can’t be reactivated.'),
    datesMatter: true,
    done: 'graduated',
  },
  withdrawn: {
    verb: tr('Withdraw'),
    from: ['active', 'suspended'],
    explain: tr('They leave the school and their class. This is final: a returning student comes back through a new admission.'),
    datesMatter: true,
    done: 'withdrawn',
  },
}

export function StatusChangeDialog({ student, to, onClose }: { student: Student; to: StudentStatus | null; onClose: () => void }) {
  const change = useChangeStudentStatus()
  const config = to ? STATUS_CHANGES[to] : null

  return (
    <FormDialog
      open={to !== null}
      onOpenChange={(o) => !o && onClose()}
      title={config ? `${config.verb} ${student.full_name}?` : ''}
      description={config?.explain}
      submitLabel={config?.verb}
      schema={schema}
      defaultValues={{ on_date: '', reason: '' }}
      onSubmit={async (v) => {
        await change.mutateAsync({
          id: student.id,
          input: { status: to!, reason: v.reason, ...(config?.datesMatter && v.on_date ? { on_date: v.on_date } : {}) },
        })
        toast.success(`${student.full_name} ${config!.done}.`)
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          {config?.datesMatter && (
            <FormField label={tr('Effective date (AD)')} error={errors.on_date?.message} description={tr('Leave empty for today.')}>
              {(p) => <Controller control={control} name="on_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
            </FormField>
          )}
          <FormField label={tr('Reason')} error={errors.reason?.message} description={tr("Kept in the student's history.")}>
            <Textarea {...register('reason')} rows={2} maxLength={255} autoFocus />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
