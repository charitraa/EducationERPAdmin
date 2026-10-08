import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate, type Location } from 'react-router-dom'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { usePageMeta } from '@/hooks/usePageMeta'
import { tokens } from '@/lib/auth'
import { applyServerErrors } from '@/lib/errors'
import { safeBack } from '@/lib/safeRedirect'
import { t, useLocale, tr } from '@/lib/i18n'
import { toApiError } from '@/shared/api/errors'
import { AuthLayout } from '../components/AuthLayout'
import { loginSchema, type LoginForm } from '../schemas/login.schema'

export default function LoginPage() {
  useLocale()
  usePageMeta({ title: tr('Log in · Education ERP'), description: tr('Log in to Education ERP to manage your school or college: students, teachers, attendance, exams and fees.') })
  const { status, login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from
  // Keep the query too: deep links such as `/scan/class?t=…` carry what they need in it.
  const back = safeBack(from ? `${from.pathname}${from.search}${from.hash}` : '/')
  const [needsOtp, setNeedsOtp] = useState(false)
  const [remember, setRemember] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', otp: '' } })
  const {
    register,
    formState: { errors, isSubmitting },
  } = form

  if (status === 'authenticated') return <Navigate to={back} replace />

  const submit = form.handleSubmit(async ({ email, password, otp }) => {
    setServerError(null)
    if (needsOtp && !otp) {
      form.setError('otp', { message: tr('Enter the code.') })
      return
    }
    try {
      tokens.remember(remember)
      await login(needsOtp ? { email, password, otp } : { email, password })
      navigate(back, { replace: true })
    } catch (err) {
      const e = toApiError(err)
      if (e.code === 'otp_required') {
        // Two-factor is on: ask for the code and send the same credentials again.
        setNeedsOtp(true)
        setTimeout(() => form.setFocus('otp'), 0)
        return
      }
      setServerError(applyServerErrors(e, form.setError, ['email', 'password', 'otp']))
    }
  })

  return (
    <AuthLayout
      title={needsOtp ? tr('Two-step verification') : tr('Welcome back')}
      subtitle={needsOtp ? t('auth.otpHint') : tr('Log in to manage your institution.')}
      footer={
        <>
          {tr("Don't have an account?")}{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            {tr('Create a free account')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        {sessionExpired && !serverError && <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">{t('auth.sessionExpired')}</p>}
        <FormError message={serverError} />
        <div className={needsOtp ? 'hidden' : 'grid gap-4'}>
          <FormField label={t('auth.email')} error={errors.email?.message}>
            <Input {...register('email')} type="email" autoComplete="username" autoFocus />
          </FormField>
          <FormField label={t('auth.password')} error={errors.password?.message}>
            <Input {...register('password')} type="password" autoComplete="current-password" />
          </FormField>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              {tr('Remember me')}
            </label>
            <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
              {t('auth.forgot')}
            </Link>
          </div>
        </div>
        {needsOtp && (
          <FormField label={t('auth.otp')} error={errors.otp?.message} description={tr('Lost your phone? Type one of your recovery codes instead.')}>
            <Input {...register('otp')} autoComplete="one-time-code" inputMode="text" className="font-mono tracking-widest" placeholder="123456" />
          </FormField>
        )}
        <Button type="submit" className="h-10" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : needsOtp && <ShieldCheck aria-hidden />}
          {needsOtp ? tr('Verify and sign in') : tr('Log in')}
        </Button>
        {needsOtp && (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setNeedsOtp(false)
              form.setValue('otp', '')
            }}
          >
            {tr('Use a different account')}
          </button>
        )}
      </form>
    </AuthLayout>
  )
}
