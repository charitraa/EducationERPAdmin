import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { applyServerErrors } from '@/lib/errors'
import { passwordResetApi } from '../api/account.api'
import { AuthLayout } from '../components/AuthLayout'
import { tr } from '@/lib/i18n'

const schema = z.object({ email: z.string().trim().min(1, tr('Enter your email.')).email(tr('Enter a valid email.')) })

/** Asks for a reset link. The answer is the same whether or not the account exists. */
export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: '' } })
  const {
    register,
    formState: { errors, isSubmitting },
  } = form

  const submit = form.handleSubmit(async ({ email }) => {
    setServerError(null)
    try {
      await passwordResetApi.request(email)
      setSentTo(email)
    } catch (err) {
      setServerError(applyServerErrors(err, form.setError, ['email']))
    }
  })

  const back = (
    <Link to="/login" className="font-medium text-primary hover:underline">
      {tr('Back to sign in')}
    </Link>
  )

  if (sentTo)
    return (
      <AuthLayout title={tr('Check your email')} footer={back}>
        <div role="status" className="flex gap-3 rounded-md border bg-muted/40 p-4 text-sm">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <div className="grid gap-2">
            <p>
              {tr('If an account uses')} <strong className="break-words">{sentTo}</strong>{', ' + tr('a link to choose a new password is on its way. It works for an hour.')}
            </p>
            <p className="text-muted-foreground">{tr("Nothing after a few minutes? Check spam, or ask your school's administrator to set a new password for you.")}</p>
          </div>
        </div>
        <button type="button" className="mt-4 text-sm text-muted-foreground hover:text-foreground" onClick={() => setSentTo(null)}>
          {tr('Use a different email')}
        </button>
      </AuthLayout>
    )

  return (
    <AuthLayout title={tr('Forgot your password?')} subtitle={tr("Enter the email you sign in with and we'll send you a link to choose a new one.")} footer={back}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={serverError} />
        <FormField label={tr('Email')} error={errors.email?.message}>
          <Input {...register('email')} type="email" autoComplete="username" autoFocus />
        </FormField>
        <Button type="submit" className="h-10" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {tr('Send reset link')}
        </Button>
      </form>
    </AuthLayout>
  )
}
