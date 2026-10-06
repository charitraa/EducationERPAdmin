import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { authApi, authKeys } from '@/features/authentication/api/auth.api'
import { toast } from '@/hooks/useToast'
import { tr } from '@/lib/i18n'
import type { CurrentUser } from '@/shared/types/auth'

const detailsSchema = z.object({
  first_name: z.string().trim().min(1, tr('Required.')).max(100),
  middle_name: z.string().trim().max(100),
  last_name: z.string().trim().max(100),
  phone: z.string().trim().max(30),
})

/** Name and phone. Email and roles stay with an administrator, so they aren't offered here. */
export function EditDetailsDialog({ user, open, onOpenChange }: { user: CurrentUser; open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Edit my details')}
      description={tr('Your email and roles can only be changed by an administrator.')}
      schema={detailsSchema}
      defaultValues={{ first_name: user.first_name ?? '', middle_name: user.middle_name ?? '', last_name: user.last_name ?? '', phone: user.phone ?? '' }}
      onSubmit={async (values) => {
        const updated = await authApi.updateMe(values)
        qc.setQueryData(authKeys.me, updated)
        toast.success(tr('Your details are saved.'))
      }}
    >
      {({ register, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('First name')} required error={errors.first_name?.message}>
              <Input {...register('first_name')} autoComplete="given-name" />
            </FormField>
            <FormField label={tr('Middle name')} error={errors.middle_name?.message}>
              <Input {...register('middle_name')} autoComplete="additional-name" />
            </FormField>
            <FormField label={tr('Last name')} error={errors.last_name?.message}>
              <Input {...register('last_name')} autoComplete="family-name" />
            </FormField>
          </div>
          <FormField label={tr('Phone')} error={errors.phone?.message}>
            <Input {...register('phone')} type="tel" autoComplete="tel" inputMode="tel" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

const passwordSchema = z
  .object({ current_password: z.string().min(1, tr('Required.')), new_password: z.string().min(8, tr('At least 8 characters.')), confirm: z.string() })
  .refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: tr("Passwords don't match.") })

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Change password')}
      schema={passwordSchema}
      defaultValues={{ current_password: '', new_password: '', confirm: '' }}
      submitLabel={tr('Change password')}
      onSubmit={async ({ current_password, new_password }) => {
        await authApi.changePassword({ current_password, new_password })
        toast.success(tr('Password changed. Use the new one next time you sign in.'))
      }}
    >
      {({ register, formState: { errors } }) => (
        <>
          <FormField label={tr('Current password')} required error={errors.current_password?.message}>
            <Input {...register('current_password')} type="password" autoComplete="current-password" />
          </FormField>
          <FormField label={tr('New password')} required error={errors.new_password?.message} description={tr('At least 8 characters; avoid your name or a common word.')}>
            <Input {...register('new_password')} type="password" autoComplete="new-password" />
          </FormField>
          <FormField label={tr('Confirm new password')} required error={errors.confirm?.message}>
            <Input {...register('confirm')} type="password" autoComplete="new-password" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
