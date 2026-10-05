import { AlertTriangle } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { toast } from '@/hooks/useToast'
import { isoDate, optionalIsoDate } from '@/lib/validation'
import type { Schema } from '@/shared/types/api'
import type { StaffMember } from '../api/staff.api'
import { useUpdateStaff } from '../hooks/useStaff'
import { tr } from '@/lib/i18n'

export type StaffStatus = Schema<'StaffStatusEnum'>

/** Each change the page offers, and the statuses it starts from. `left` needs a date and no open teaching duties. */
export const STAFF_STATUS_CHANGES: Record<string, { to: StaffStatus; label: string; from: readonly StaffStatus[]; explain: string; done: string }> = {
  leave: { to: 'on_leave', label: tr('Mark on leave'), from: ['active'], explain: tr('They stay on staff and keep their classes.'), done: 'is on leave' },
  back: { to: 'active', label: tr('Back from leave'), from: ['on_leave'], explain: tr('They’re active again.'), done: 'is back' },
  left: {
    to: 'left',
    label: tr('Mark as left'),
    from: ['active', 'on_leave'],
    explain: tr('Their record is kept. Lessons and class-teacher duties from that date must be handed over first.'),
    done: 'has left',
  },
  rejoin: { to: 'active', label: tr('Rejoin'), from: ['left'], explain: tr('Clears their leaving date and makes them active again.'), done: 'has rejoined' },
}

export function StaffStatusDialog({ member, change, onClose }: { member: StaffMember; change: string | null; onClose: () => void }) {
  const update = useUpdateStaff()
  const c = change ? STAFF_STATUS_CHANGES[change] : null
  const leaving = c?.to === 'left'
  const schema = z.object({ left_on: leaving ? isoDate : optionalIsoDate, status: z.string() })

  return (
    <FormDialog
      open={c !== null}
      onOpenChange={(o) => !o && onClose()}
      title={c ? `${c.label}: ${member.full_name}` : ''}
      description={c?.explain}
      submitLabel={c?.label}
      schema={schema}
      defaultValues={{ left_on: '', status: '' }}
      onSubmit={async (v) => {
        await update.mutateAsync({ id: member.id, input: { status: c!.to, left_on: leaving ? v.left_on : null } })
        toast.success(`${member.full_name} ${c!.done}.`)
      }}
    >
      {({ control, formState: { errors } }) => (
        <>
          {leaving && (
            <FormField label={tr('Last day (AD)')} required error={errors.left_on?.message}>
              {(p) => <Controller control={control} name="left_on" render={({ field }) => <DatePicker {...p} {...field} />} />}
            </FormField>
          )}
          {/* The backend explains what still needs handing over on `status`. */}
          {errors.status?.message && (
            <p role="alert" className="flex gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              {errors.status.message}
            </p>
          )}
        </>
      )}
    </FormDialog>
  )
}
