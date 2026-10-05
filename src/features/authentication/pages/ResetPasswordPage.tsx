import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, Loader2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { applyServerErrors } from '@/lib/errors'
import { toApiError } from '@/shared/api/errors'
import { passwordResetApi } from '../api/account.api'
import { AuthLayout } from '../components/AuthLayout'
import { tr } from '@/lib/i18n'

const schema = z
  .object({ new_password: z.string().min(8, tr('At least 8 characters.')), confirm: z.string() })
  .refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: tr("Passwords don't match.") })

/** Target of the emailed link: `/reset-password?uid=…&token=…`. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''
  const [done, setDone] = useState(false)
  const [badLink, setBadLink] = useState<string | null>(uid && token ? null : "This link is incomplete. Open it straight from the email, or ask for a new one.")
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { new_password: '', confirm: '' } })
  const {
    register,
    formState: { errors, isSubmitting },
  } = form

  const submit = form.handleSubmit(async ({ new_password }) => {
    setServerError(null)
    try {
      await passwordResetApi.confirm({ uid, token, new_password })
      setDone(true)
    } catch (err) {
      const e = toApiError(err)
      if (e.code === 'invalid_token') setBadLink(e.message)
      else setServerError(applyServerErrors(e, form.setError, ['new_password']))
    }
  })

  if (done)
    return (
      <AuthLayout title={tr('Password changed')}>
        <div role="status" className="mb-4 flex gap-3 rounded-md border bg-success-soft p-4 text-sm text-success">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{tr("Your new password is set. For safety, you've been signed out on every device; sign in again with the new one.")}</p>
        </div>
        <Button asChild className="h-10 w-full">
          <Link to="/login">{tr('Sign in')}</Link>
        </Button>
      </AuthLayout>
    )

  if (badLink)
    return (
      <AuthLayout title={tr("This link doesn't work")}>
        <div role="alert" className="mb-4 flex gap-3 rounded-md border bg-warning-soft p-4 text-sm text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{badLink}</p>
        </div>
        <div className="grid gap-2">
          <Button asChild className="h-10">
            <Link to="/forgot-password">{tr('Send a new link')}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/login">{tr('Back to sign in')}</Link>
          </Button>
        </div>
      </AuthLayout>
    )

  return (
    <AuthLayout title={tr('Choose a new password')} subtitle={tr("You'll be signed out everywhere else once it's changed.")}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={serverError} />
        <FormField label={tr('New password')} error={errors.new_password?.message} description={tr('At least 8 characters; avoid your name or a common word.')}>
          <Input {...register('new_password')} type="password" autoComplete="new-password" autoFocus />
        </FormField>
        <FormField label={tr('Confirm new password')} error={errors.confirm?.message}>
          <Input {...register('confirm')} type="password" autoComplete="new-password" />
        </FormField>
        <Button type="submit" className="h-10" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {tr('Change password')}
        </Button>
      </form>
    </AuthLayout>
  )
}
