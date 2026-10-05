import { useMutation } from '@tanstack/react-query'
import { Hourglass, Loader2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage } from '@/lib/errors'
import { toApiError } from '@/shared/api/errors'
import { signupApi } from '../api/account.api'
import { AuthLayout } from '../components/AuthLayout'
import { tr } from '@/lib/i18n'

/**
 * Target of the emailed link: `/signup/verify?token=…`. Opening it creates the
 * organization and signs in, or queues it for a platform admin's approval.
 */
export default function SignupVerifyPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const verify = useMutation({
    mutationFn: () => signupApi.verify(token),
    onSuccess: (res) => {
      if (res.organization && 'access' in res) {
        signIn(res)
        // A brand-new school: straight into the setup guide.
        navigate('/settings/setup', { replace: true })
      }
    },
  })
  // The token works once; StrictMode's double effect mustn't spend it twice.
  const started = useRef(false)
  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    verify.mutate()
  }, [token, verify])

  if (!token || verify.isError) {
    const e = verify.isError ? toApiError(verify.error) : null
    const message = !token
      ? tr('This link is incomplete. Open it straight from the email.')
      : e?.code === 'expired_token' || e?.code === 'invalid_token' || e?.code === 'code_taken' || e?.code === 'email_taken'
        ? e.message
        : errorMessage(verify.error)
    return (
      <AuthLayout title={tr("We couldn't confirm your email")}>
        <div role="alert" className="mb-4 flex gap-3 rounded-md border bg-warning-soft p-4 text-sm text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{message}</p>
        </div>
        <div className="grid gap-2">
          {e?.code === 'email_taken' ? (
            <Button asChild className="h-10">
              <Link to="/login">{tr('Sign in')}</Link>
            </Button>
          ) : (
            <Button asChild className="h-10">
              <Link to="/signup">{tr('Sign up again')}</Link>
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            {tr('Expired or replaced? Signing up again with the same email sends a fresh link.')}
          </p>
        </div>
      </AuthLayout>
    )
  }

  if (verify.isSuccess && !verify.data.organization)
    return (
      <AuthLayout title={tr('Email confirmed')}>
        <div role="status" className="mb-4 flex gap-3 rounded-md border bg-info-soft p-4 text-sm text-info">
          <Hourglass className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{tr("Thanks. Your school is waiting for approval; we'll email you as soon as it's ready, and then you can sign in with the email and password you chose.")}</p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link to="/login">{tr('Back to sign in')}</Link>
        </Button>
      </AuthLayout>
    )

  return (
    <AuthLayout title={tr('Confirming your email…')}>
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {tr('Creating your school. This takes a few seconds.')}
      </p>
    </AuthLayout>
  )
}
