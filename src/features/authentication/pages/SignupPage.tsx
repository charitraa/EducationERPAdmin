import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { CircleCheck, Info, Loader2, MailCheck, RefreshCw, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/useDebounce'
import { usePageMeta } from '@/hooks/usePageMeta'
import { applyServerErrors, errorMessage } from '@/lib/errors'
import { ApiError, toApiError } from '@/shared/api/errors'
import { signupApi, signupKeys, type SignupConfig } from '../api/account.api'
import { AuthLayout } from '../components/AuthLayout'
import { Captcha, type CaptchaHandle } from '../components/Captcha'
import { ORG_CODE, signupSchema, suggestCode, type SignupForm } from '../schemas/signup.schema'
import { tr } from '@/lib/i18n'

const FIELDS = ['organization_name', 'organization_code', 'organization_type', 'timezone', 'first_name', 'last_name', 'email', 'phone', 'password'] as const

/** ICU (and so the browser) still uses a few renamed zones; the IANA names are what people expect to see. */
const RENAMED: Record<string, string> = {
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Europe/Kiev': 'Europe/Kyiv',
}
const canonical = (zone: string) => RENAMED[zone] ?? zone

const browserZone = () => {
  try {
    return canonical(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kathmandu')
  } catch {
    return 'Asia/Kathmandu'
  }
}

const zones = (): string[] => {
  try {
    return Intl.supportedValuesOf('timeZone').map(canonical)
  } catch {
    return ['Asia/Kathmandu', 'UTC']
  }
}

const signInLink = (
  <>
    {tr('Already have an account?')}{' '}
    <Link to="/login" className="font-medium text-primary hover:underline">
      {tr('Log in')}
    </Link>
  </>
)

/** Live "is this code free?" under the code field. */
function CodeStatus({ code }: { code: string }) {
  const debounced = useDebounce(code.trim(), 400)
  const valid = debounced.length >= 2 && ORG_CODE.test(debounced)
  const check = useQuery({
    queryKey: ['signup', 'check-code', debounced],
    queryFn: () => signupApi.checkCode(debounced),
    enabled: valid,
    staleTime: 30_000,
    retry: false,
    retryOnMount: false,
  })
  if (!valid || debounced !== code.trim()) return null
  if (check.isPending) return <span className="text-muted-foreground">{tr('Checking…')}</span>
  if (check.isError || !check.data) return null
  if (check.data.available)
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <CircleCheck className="h-3.5 w-3.5" aria-hidden /> {tr('Available')}
      </span>
    )
  const why = { taken: tr('Another school already uses this code.'), reserved: tr('This code is reserved; choose another.'), invalid: tr('Not a valid code.') }
  return <span className="text-danger">{why[check.data.reason ?? 'invalid']}</span>
}

function SentPanel({ email, config }: { email: string; config: SignupConfig }) {
  const captcha = useRef<CaptchaHandle | null>(null)
  const [state, setState] = useState<{ busy: boolean; note: string | null; error: string | null }>({ busy: false, note: null, error: null })
  const resend = async () => {
    setState({ busy: true, note: null, error: null })
    try {
      const token = await (captcha.current?.token() ?? Promise.resolve(''))
      await signupApi.resend(email, token || undefined)
      setState({ busy: false, note: tr('A new link is on its way. Only the newest link works.'), error: null })
    } catch (err) {
      setState({ busy: false, note: null, error: err instanceof ApiError ? errorMessage(err) : (err as Error).message })
    } finally {
      captcha.current?.reset()
    }
  }
  return (
    <AuthLayout title={tr('Check your email')} footer={signInLink}>
      <div role="status" className="flex gap-3 rounded-md border bg-muted/40 p-4 text-sm">
        <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <div className="grid gap-2">
          <p>
            {tr('We sent a link to')} <strong className="break-words">{email}</strong>{tr('. Open it to confirm your email; nothing is created until you do.')}
          </p>
          <p className="text-muted-foreground">
            {config.requires_approval
              ? tr("After you confirm, we'll review your school and email you once it's approved.")
              : tr("Once you confirm, you'll be signed in and the setup guide walks you through the rest.")}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <p className="text-sm text-muted-foreground">{tr('No email after a few minutes? Check spam, then send it again.')}</p>
        <Captcha provider={config.captcha_provider} siteKey={config.captcha_site_key} action="signup_resend" onReady={(h) => (captcha.current = h)} />
        {state.note && <p className="text-sm text-success">{state.note}</p>}
        <FormError message={state.error} />
        <Button type="button" variant="outline" onClick={resend} disabled={state.busy}>
          {state.busy ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
          {tr('Send the link again')}
        </Button>
      </div>
    </AuthLayout>
  )
}

function SignupFormView({ config, onSent }: { config: SignupConfig; onSent: (email: string) => void }) {
  const captcha = useRef<CaptchaHandle | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [codeTouched, setCodeTouched] = useState(false)
  const timezoneOptions = useMemo(zones, [])
  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      organization_name: '',
      organization_code: '',
      organization_type: config.organization_types.some((t) => t.value === 'college') ? 'college' : (config.organization_types[0]?.value ?? ''),
      timezone: browserZone(),
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      confirm: '',
      terms: false,
    },
  })
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form
  const code = watch('organization_code')

  const nameField = register('organization_name')

  const submit = form.handleSubmit(async ({ confirm: _confirm, terms: _terms, ...values }) => {
    setServerError(null)
    let captchaToken = ''
    try {
      captchaToken = (await captcha.current?.token()) ?? ''
    } catch (err) {
      setServerError((err as Error).message)
      return
    }
    try {
      await signupApi.start({ ...values, captcha_token: captchaToken || undefined })
      onSent(values.email)
    } catch (err) {
      const e = toApiError(err)
      setServerError(e.code === 'signup_disabled' ? e.message : applyServerErrors(e, form.setError, FIELDS))
      captcha.current?.reset()
    }
  })

  return (
    <AuthLayout
      title={tr('Create your free institution account')}
      subtitle={
        config.requires_approval
          ? tr("Get your school or college online in a few minutes. You'll confirm your email, then we review the request and let you know when it's ready.")
          : tr("Get your school or college online in a few minutes. You'll confirm your email, then the setup guide walks you through the rest.")
      }
      footer={signInLink}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={serverError} />
        <fieldset className="grid gap-4">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('Your institution')}</legend>
          <FormField label={tr('Institution name')} required error={errors.organization_name?.message}>
            <Input
              {...nameField}
              onChange={(e) => {
                nameField.onChange(e)
                if (!codeTouched) setValue('organization_code', suggestCode(e.target.value))
              }}
              autoFocus
            />
          </FormField>
          <FormField
            label={tr('Short code')}
            required
            error={errors.organization_code?.message}
            description={
              <span className="flex flex-wrap justify-between gap-x-3">
                <span>{tr('Permanent. Used in your public admission and careers links.')}</span>
                <CodeStatus code={code} />
              </span>
            }
          >
            <Input
              {...register('organization_code', {
                onChange: (e) => {
                  setCodeTouched(true)
                  setValue('organization_code', String(e.target.value).toLowerCase())
                },
              })}
              className="font-mono"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="central-college"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Institution type')} required error={errors.organization_type?.message}>
              {(p) => <Controller control={control} name="organization_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={config.organization_types} />} />}
            </FormField>
            <FormField label={tr('Time zone')} required error={errors.timezone?.message}>
              <Input {...register('timezone')} list="signup-timezones" autoComplete="off" spellCheck={false} />
            </FormField>
          </div>
          <datalist id="signup-timezones">
            {timezoneOptions.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('You, the administrator')}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('First name')} required error={errors.first_name?.message}>
              <Input {...register('first_name')} autoComplete="given-name" />
            </FormField>
            <FormField label={tr('Last name')} error={errors.last_name?.message}>
              <Input {...register('last_name')} autoComplete="family-name" />
            </FormField>
          </div>
          <FormField label={tr('Email')} required error={errors.email?.message} description={tr("We'll send a confirmation link here. You'll sign in with it.")}>
            <Input {...register('email')} type="email" autoComplete="email" />
          </FormField>
          <FormField label={tr('Phone')} error={errors.phone?.message}>
            <Input {...register('phone')} type="tel" autoComplete="tel" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Password')} required error={errors.password?.message}>
              <Input {...register('password')} type="password" autoComplete="new-password" />
            </FormField>
            <FormField label={tr('Confirm password')} required error={errors.confirm?.message}>
              <Input {...register('confirm')} type="password" autoComplete="new-password" />
            </FormField>
          </div>
        </fieldset>

        <div className="grid gap-1">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <Controller
              control={control}
              name="terms"
              render={({ field }) => (
                <Checkbox className="mt-0.5" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} aria-invalid={!!errors.terms} aria-describedby={errors.terms ? 'signup-terms-error' : undefined} />
              )}
            />
            <span>
              {/* One sentence, so translations can put the links where their grammar needs them. */}
              {tr('I agree to the {terms} and {privacy}.')
                .split(/(\{terms\}|\{privacy\})/)
                .map((part, i) =>
                  part === '{terms}' ? (
                    <Link key={i} to="/terms" target="_blank" className="font-medium text-primary hover:underline">
                      {tr('Terms of Service')}
                    </Link>
                  ) : part === '{privacy}' ? (
                    <Link key={i} to="/privacy" target="_blank" className="font-medium text-primary hover:underline">
                      {tr('Privacy Policy')}
                    </Link>
                  ) : (
                    part
                  ),
                )}
            </span>
          </label>
          {errors.terms && (
            <p id="signup-terms-error" className="text-xs text-danger">
              {errors.terms.message}
            </p>
          )}
        </div>

        <Captcha provider={config.captcha_provider} siteKey={config.captcha_site_key} action="signup" onReady={(h) => (captcha.current = h)} />
        <Button type="submit" className="h-10" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {tr('Create free account')}
        </Button>
      </form>
    </AuthLayout>
  )
}

/** Organization signup: `GET /signup/config/` decides whether the form shows at all. */
export default function SignupPage() {
  usePageMeta({ title: tr('Create a free account · Education ERP'), description: tr('Create a free Education ERP account for your school or college and get started in a few minutes. No setup fee, nothing to install.') })
  const [sentTo, setSentTo] = useState<string | null>(null)
  const config = useQuery({ queryKey: signupKeys.config, queryFn: signupApi.config, retry: false, retryOnMount: false, staleTime: 5 * 60_000 })

  if (config.isPending)
    return (
      <AuthLayout title={tr('Create your free institution account')}>
        <div className="grid gap-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </AuthLayout>
    )

  if (config.isError)
    return (
      <AuthLayout title={tr('Create your free institution account')} footer={signInLink}>
        <div role="alert" className="mb-4 flex gap-3 rounded-md border bg-warning-soft p-4 text-sm text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{errorMessage(config.error)}</p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => config.refetch()}>
          {tr('Try again')}
        </Button>
      </AuthLayout>
    )

  if (!config.data.enabled)
    return (
      <AuthLayout title={tr('Create your free institution account')} footer={signInLink}>
        <div className="flex gap-3 rounded-md border bg-muted/40 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <p>{tr("Online sign-up isn't open on this server. Contact the people who run it and they'll create your school's account for you.")}</p>
        </div>
      </AuthLayout>
    )

  if (sentTo) return <SentPanel email={sentTo} config={config.data} />
  return <SignupFormView config={config.data} onSent={setSentTo} />
}
