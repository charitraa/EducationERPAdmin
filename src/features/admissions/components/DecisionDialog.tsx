import { z } from 'zod'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import type { Admission, AdmissionDecision } from '../api/admissions.api'
import { useDecideAdmission } from '../hooks/useAdmissions'
import { tr } from '@/lib/i18n'

const DECISIONS: Record<AdmissionDecision, { verb: string; explain: string; noteLabel: string; done: string }> = {
  approve: {
    verb: tr('Approve'),
    explain: tr('The applicant is offered a place. Enroll them once they confirm, to create their student record.'),
    noteLabel: tr('Note'),
    done: 'approved',
  },
  reject: {
    verb: tr('Reject'),
    explain: tr('The application is closed. This can’t be undone; the applicant would need to apply again.'),
    noteLabel: tr('Reason'),
    done: 'rejected',
  },
  withdraw: {
    verb: tr('Withdraw'),
    explain: tr('Use when the applicant no longer wants the place. This can’t be undone.'),
    noteLabel: tr('Note'),
    done: 'withdrawn',
  },
}

export function DecisionDialog({ admission, decision, onClose }: { admission: Admission; decision: AdmissionDecision | null; onClose: () => void }) {
  const decide = useDecideAdmission()
  const d = decision ? DECISIONS[decision] : null
  // The backend refuses a rejection without a reason.
  const schema = z.object({ note: decision === 'reject' ? z.string().trim().min(1, tr('Give a reason; it is kept with the application.')) : z.string().trim() })

  return (
    <FormDialog
      open={decision !== null}
      onOpenChange={(o) => !o && onClose()}
      title={d ? tr('{verb} {full_name}’s application?', { verb: d.verb, full_name: admission.full_name }) : ''}
      description={d?.explain}
      submitLabel={d?.verb}
      schema={schema}
      defaultValues={{ note: '' }}
      onSubmit={async ({ note }) => {
        await decide.mutateAsync({ id: admission.id, decision: decision!, note })
        toast.success(tr('Application {application_number} {done}.', { application_number: admission.application_number, done: d!.done }))
      }}
    >
      {({ register, formState: { errors } }) => (
        <FormField label={d?.noteLabel ?? tr('Note')} required={decision === 'reject'} error={errors.note?.message}>
          <Textarea {...register('note')} rows={3} autoFocus />
        </FormField>
      )}
    </FormDialog>
  )
}
