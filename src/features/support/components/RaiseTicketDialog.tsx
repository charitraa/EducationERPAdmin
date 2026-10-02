import { z } from 'zod'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import type { Ticket } from '../api/support.api'
import { useRaiseTicket } from '../hooks/useSupport'

const schema = z.object({ subject: z.string().trim().min(1, 'Required.').max(200), description: z.string().trim().min(1, 'Say what’s wrong.') })

export function RaiseTicketDialog({ open, onOpenChange, onRaised }: { open: boolean; onOpenChange: (o: boolean) => void; onRaised?: (t: Ticket) => void }) {
  const raise = useRaiseTicket()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ask the office for help"
      description="A broken projector, a wrong mark, a login problem. You’ll see replies on the ticket."
      submitLabel="Raise ticket"
      schema={schema}
      defaultValues={{ subject: '', description: '' }}
      onSubmit={async (v) => {
        const t = await raise.mutateAsync(v)
        toast.success(`Ticket #${t.id} raised.`)
        onRaised?.(t)
      }}
    >
      {({ register, formState: { errors } }) => (
        <>
          <FormField label="Subject" required error={errors.subject?.message}>
            <Input {...register('subject')} autoFocus placeholder="Projector in Room 12 not working" />
          </FormField>
          <FormField label="Details" required error={errors.description?.message}>
            <Textarea {...register('description')} rows={5} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
