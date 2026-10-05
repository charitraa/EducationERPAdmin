import { z } from 'zod'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/useToast'
import type { User } from '../api/users.api'
import { useSetPassword } from '../hooks/useUsers'
import { tr } from '@/lib/i18n'

const schema = z
  .object({ new_password: z.string().min(8, tr('At least 8 characters.')), confirm: z.string() })
  .refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: tr('Doesn’t match.') })

export function SetPasswordDialog({ user, open, onOpenChange }: { user: User; open: boolean; onOpenChange: (o: boolean) => void }) {
  const setPassword = useSetPassword()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Set a new password for {email}', { email: user.email })}
      description={tr('Their old password stops working. Share the new one privately.')}
      submitLabel={tr('Set password')}
      schema={schema}
      defaultValues={{ new_password: '', confirm: '' }}
      onSubmit={async (v) => {
        await setPassword.mutateAsync({ id: user.id, password: v.new_password })
        toast.success(tr('Password changed.'))
      }}
    >
      {({ register, formState: { errors } }) => (
        <>
          <FormField label={tr('New password')} required error={errors.new_password?.message}>
            <Input {...register('new_password')} type="password" autoComplete="new-password" autoFocus />
          </FormField>
          <FormField label={tr('Type it again')} required error={errors.confirm?.message}>
            <Input {...register('confirm')} type="password" autoComplete="new-password" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
