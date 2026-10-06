import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Copy, Download, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { QrCode } from '@/components/data-display/QrCode'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormError } from '@/components/forms/FormError'
import { FormField, type FieldControlProps } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authKeys, twoFactorApi } from '@/features/authentication/api/auth.api'
import { toast } from '@/hooks/useToast'
import { errorMessage } from '@/lib/errors'
import { tr } from '@/lib/i18n'
import { toApiError } from '@/shared/api/errors'

/** A 400's message for one field (e.g. "Incorrect password."), else the general one. */
function messageFor(err: unknown, field: string) {
  const e = toApiError(err)
  return e.fieldErrors[field] ?? errorMessage(e)
}

/** Recovery codes, shown once: copy, download, and an "I've saved them" tick before closing. */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const savedId = useId()
  const text = codes.join('\n')
  const download = () => {
    const url = URL.createObjectURL(new Blob([text + '\n'], { type: 'text/plain' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'recovery-codes.txt' })
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="grid gap-4">
      <p role="alert" className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          <span className="font-medium">{tr('Save these codes now. They won’t be shown again.')}</span>{' '}
          {tr('If you lose your phone, each code signs you in once instead of an app code.')}
        </span>
      </p>
      <ol className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg border bg-muted/40 p-4 font-mono text-sm" aria-label={tr('Recovery codes')}>
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigator.clipboard?.writeText(text)
            setCopied(true)
          }}
        >
          <Copy aria-hidden /> {copied ? tr('Copied') : tr('Copy')}
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <Download aria-hidden /> {tr('Download')}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={savedId} checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
        <Label htmlFor={savedId}>{tr('I’ve saved these codes somewhere safe')}</Label>
      </div>
      <DialogFooter>
        <Button onClick={onDone} disabled={!saved}>
          {tr('Done')}
        </Button>
      </DialogFooter>
    </div>
  )
}

/** Six digits from the app; recovery codes are longer, so only trim. */
function CodeInput({ value, onChange, allowRecovery, ...field }: { value: string; onChange: (v: string) => void; allowRecovery?: boolean } & Partial<FieldControlProps>) {
  return (
    <Input
      {...field}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode={allowRecovery ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      maxLength={32}
      className="font-mono tracking-widest"
      placeholder={allowRecovery ? undefined : '123456'}
      autoFocus
    />
  )
}

type SetupStep = { step: 'password' } | { step: 'scan'; secret: string; uri: string } | { step: 'codes'; codes: string[] }

/** Turn it on: confirm the password, scan the code into an app, type the app's first code, save recovery codes. */
function SetupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [state, setState] = useState<SetupStep>({ step: 'password' })
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setState({ step: 'password' })
      setPassword('')
      setCode('')
      setError(null)
    }
  }, [open])

  const run = (fn: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }
  const start = run(async () => {
    if (!password) return setError(tr('Enter your password.'))
    try {
      const res = await twoFactorApi.setup(password)
      setState({ step: 'scan', secret: res.secret, uri: res.otpauth_uri })
      void qc.invalidateQueries({ queryKey: authKeys.twoFactor })
    } catch (err) {
      setError(messageFor(err, 'password'))
    }
  })
  const confirm = run(async () => {
    if (!code.trim()) return setError(tr('Enter the code.'))
    try {
      const res = await twoFactorApi.confirm(code.trim())
      setState({ step: 'codes', codes: res.recovery_codes })
      void qc.invalidateQueries({ queryKey: authKeys.twoFactor })
    } catch (err) {
      setError(messageFor(err, 'code'))
    }
  })
  const finish = () => {
    onOpenChange(false)
    toast.success(tr('Two-factor sign-in is on. You’ll be asked for a code from your app when you sign in.'))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => state.step !== 'codes' && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{state.step === 'codes' ? tr('Your recovery codes') : tr('Turn on two-factor sign-in')}</DialogTitle>
          <DialogDescription>
            {state.step === 'password'
              ? tr('Confirm it’s you first.')
              : state.step === 'scan'
                ? tr('Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…), then type the 6-digit code it shows.')
                : tr('Two-factor sign-in is now on.')}
          </DialogDescription>
        </DialogHeader>
        {state.step === 'password' && (
          <form onSubmit={start} noValidate className="grid gap-4">
            <FormError message={error} />
            <FormField label={tr('Password')} required>
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </FormField>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tr('Cancel')}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="animate-spin" aria-hidden />} {tr('Continue')}
              </Button>
            </DialogFooter>
          </form>
        )}
        {state.step === 'scan' && (
          <form onSubmit={confirm} noValidate className="grid gap-4">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <QrCode value={state.uri} label={tr('QR code for your authenticator app')} className="h-44 w-44 shrink-0 rounded-md border bg-white p-1" />
              <div className="grid min-w-0 gap-1 text-sm">
                <p className="text-muted-foreground">{tr('Can’t scan it? Type this key into the app instead:')}</p>
                <p className="flex flex-wrap gap-x-2 font-mono text-sm tracking-wider" data-no-i18n>
                  {state.secret.match(/.{1,4}/g)?.map((g, i) => <span key={i}>{g}</span>)}
                </p>
              </div>
            </div>
            <FormError message={error} />
            <FormField label={tr('Code from the app')} required>
              <CodeInput value={code} onChange={setCode} />
            </FormField>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tr('Cancel')}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="animate-spin" aria-hidden />} {tr('Turn on')}
              </Button>
            </DialogFooter>
          </form>
        )}
        {state.step === 'codes' && <RecoveryCodes codes={state.codes} onDone={finish} />}
      </DialogContent>
    </Dialog>
  )
}

/** New recovery codes replace every old one; needs a current app code. */
function NewCodesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) {
      setCode('')
      setCodes(null)
      setError(null)
    }
  }, [open])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return setError(tr('Enter the code.'))
    setBusy(true)
    setError(null)
    try {
      setCodes((await twoFactorApi.newRecoveryCodes(code.trim())).recovery_codes)
      void qc.invalidateQueries({ queryKey: authKeys.twoFactor })
    } catch (err) {
      setError(messageFor(err, 'code'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !codes && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{tr('New recovery codes')}</DialogTitle>
          {!codes && <DialogDescription>{tr('Your old recovery codes stop working as soon as the new ones are made.')}</DialogDescription>}
        </DialogHeader>
        {codes ? (
          <RecoveryCodes codes={codes} onDone={() => onOpenChange(false)} />
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-4">
            <FormError message={error} />
            <FormField label={tr('Code from the app')} required>
              <CodeInput value={code} onChange={setCode} />
            </FormField>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tr('Cancel')}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="animate-spin" aria-hidden />} {tr('Make new codes')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

const disableSchema = z.object({ password: z.string().min(1, tr('Required.')), code: z.string().trim().min(1, tr('Required.')) })

/** Two-factor sign-in for the signed-in person: on, off, half set up, and how many recovery codes are left. */
export function TwoFactorPanel() {
  const qc = useQueryClient()
  const status = useQuery({ queryKey: authKeys.twoFactor, queryFn: twoFactorApi.status })
  const [dialog, setDialog] = useState<'setup' | 'codes' | 'disable' | null>(null)
  const close = (o: boolean) => !o && setDialog(null)

  let body
  if (status.isPending) body = <p className="text-sm text-muted-foreground">{tr('Loading…')}</p>
  else if (status.isError) body = <p className="text-sm text-danger">{errorMessage(status.error)}</p>
  else if (status.data.enabled) {
    const left = status.data.recovery_codes_left
    body = (
      <>
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <ShieldCheck className="h-4 w-4" aria-hidden /> {tr('On')}
        </p>
        <p className="text-sm text-muted-foreground">{tr('Signing in asks for a code from your authenticator app as well as your password.')}</p>
        <p className={left <= 2 ? 'text-sm font-medium text-warning' : 'text-sm text-muted-foreground'}>
          {left === 0
            ? tr('No recovery codes left. Make new ones in case you lose your phone.')
            : left === 1
              ? tr('1 recovery code left.')
              : tr('{count} recovery codes left.', { count: left })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setDialog('codes')}>
            <KeyRound aria-hidden /> {tr('New recovery codes')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDialog('disable')}>
            <ShieldOff aria-hidden /> {tr('Turn off')}
          </Button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <p className="text-sm font-medium">{tr('Off')}</p>
        <p className="text-sm text-muted-foreground">
          {status.data.pending_setup
            ? tr('Setup was started but never finished, so it isn’t on yet. Start again to get a fresh code.')
            : tr('Add a code from your phone to your password, so a stolen password alone can’t open your account.')}
        </p>
        <div>
          <Button size="sm" onClick={() => setDialog('setup')}>
            <ShieldCheck aria-hidden /> {status.data.pending_setup ? tr('Set up again') : tr('Turn on')}
          </Button>
        </div>
      </>
    )
  }

  return (
    <div className="grid gap-2">
      {body}
      <SetupDialog open={dialog === 'setup'} onOpenChange={close} />
      <NewCodesDialog open={dialog === 'codes'} onOpenChange={close} />
      <FormDialog
        open={dialog === 'disable'}
        onOpenChange={close}
        title={tr('Turn off two-factor sign-in?')}
        description={tr('Your password alone will open your account again. Your recovery codes stop working.')}
        schema={disableSchema}
        defaultValues={{ password: '', code: '' }}
        submitLabel={tr('Turn off')}
        onSubmit={async (values) => {
          await twoFactorApi.disable(values)
          await qc.invalidateQueries({ queryKey: authKeys.twoFactor })
          toast.success(tr('Two-factor sign-in is off.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <>
            <FormField label={tr('Password')} required error={errors.password?.message}>
              <Input {...register('password')} type="password" autoComplete="current-password" />
            </FormField>
            <FormField label={tr('Code from the app, or a recovery code')} required error={errors.code?.message}>
              <Input {...register('code')} autoComplete="one-time-code" className="font-mono tracking-widest" />
            </FormField>
          </>
        )}
      </FormDialog>
    </div>
  )
}
