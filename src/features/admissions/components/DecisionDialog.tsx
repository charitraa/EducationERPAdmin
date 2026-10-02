import { z } from 'zod'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import type { Admission, AdmissionDecision } from '../api/admissions.api'
import { useDecideAdmission } from '../hooks/useAdmissions'

const DECISIONS: Record<AdmissionDecision, { verb: string; explain: string; noteLabel: string; done: string }> = {
  approve: {
    verb: 'Approve',
    explain: 'The applicant is offered a place. Enroll them once they confirm, to create their student record.',
    noteLabel: 'Note',
    done: 'approved',
  },
  reject: {
    verb: 'Reject',
    explain: 'The application is closed. This can’t be undone; the applicant would need to apply again.',
    noteLabel: 'Reason',
    done: 'rejected',
  },
  withdraw: {
    verb: 'Withdraw',
    explain: 'Use when the applicant no longer wants the place. This can’t be undone.',
    noteLabel: 'Note',
    done: 'withdrawn',
  },
}

export function DecisionDialog({ admission, decision, onClose }: { admission: Admission; decision: AdmissionDecision | null; onClose: () => void }) {
  const decide = useDecideAdmission()
  const d = decision ? DECISIONS[decision] : null
  // The backend refuses a rejection without a reason.
  const schema = z.object({ note: decision === 'reject' ? z.string().trim().min(1, 'Give a reason; it is kept with the application.') : z.string().trim() })

  return (
    <FormDialog
      open={decision !== null}
      onOpenChange={(o) => !o && onClose()}
      title={d ? `${d.verb} ${admission.full_name}’s application?` : ''}
      description={d?.explain}
      submitLabel={d?.verb}
      schema={schema}
      defaultValues={{ note: '' }}
      onSubmit={async ({ note }) => {
        await decide.mutateAsync({ id: admission.id, decision: decision!, note })
        toast.success(`Application ${admission.application_number} ${d!.done}.`)
      }}
    >
      {({ register, formState: { errors } }) => (
        <FormField label={d?.noteLabel ?? 'Note'} required={decision === 'reject'} error={errors.note?.message}>
          <Textarea {...register('note')} rows={3} autoFocus />
        </FormField>
      )}
    </FormDialog>
  )
}
