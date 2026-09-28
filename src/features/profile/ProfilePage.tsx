import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { authApi } from '@/lib/api/auth'
import { toApiError } from '@/lib/api/errors'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from '@/stores/toast-store'

const profileSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Required'),
  phone: z.string().optional(),
})

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Required'),
    new_password: z.string().min(8, 'At least 8 characters'),
    confirm_password: z.string().min(1, 'Required'),
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const qc = useQueryClient()

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: user
      ? {
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          phone: user.phone,
        }
      : undefined,
  })

  const updateProfile = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updated) => {
      setUser(updated)
      toast({ title: 'Profile updated', variant: 'success' })
    },
    onError: (err) => toast({ title: 'Update failed', description: toApiError(err).message, variant: 'error' }),
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) })
  const changePassword = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast({ title: 'Password changed', variant: 'success' })
      passwordForm.reset()
    },
    onError: (err) => toast({ title: 'Could not change password', description: toApiError(err).message, variant: 'error' }),
  })

  const { data: twoFactor } = useQuery({ queryKey: ['auth', '2fa'], queryFn: authApi.twoFactorStatus })

  if (!user) return null

  return (
    <div>
      <PageHeader title="My profile" description={user.email} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardBody>
            <form
              className="flex flex-col gap-4"
              onSubmit={profileForm.handleSubmit((values) => updateProfile.mutate(values))}
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First name" required error={profileForm.formState.errors.first_name?.message}>
                  <Input {...profileForm.register('first_name')} />
                </FormField>
                <FormField label="Last name" required error={profileForm.formState.errors.last_name?.message}>
                  <Input {...profileForm.register('last_name')} />
                </FormField>
              </div>
              <FormField label="Middle name">
                <Input {...profileForm.register('middle_name')} />
              </FormField>
              <FormField label="Phone">
                <Input {...profileForm.register('phone')} />
              </FormField>
              <div>
                <Button type="submit" loading={updateProfile.isPending}>
                  Save changes
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardBody>
            <form
              className="flex flex-col gap-4"
              onSubmit={passwordForm.handleSubmit((values) => changePassword.mutate(values))}
            >
              <FormField label="Current password" required error={passwordForm.formState.errors.current_password?.message}>
                <Input type="password" {...passwordForm.register('current_password')} />
              </FormField>
              <FormField label="New password" required error={passwordForm.formState.errors.new_password?.message}>
                <Input type="password" {...passwordForm.register('new_password')} />
              </FormField>
              <FormField label="Confirm new password" required error={passwordForm.formState.errors.confirm_password?.message}>
                <Input type="password" {...passwordForm.register('confirm_password')} />
              </FormField>
              <div>
                <Button type="submit" loading={changePassword.isPending}>
                  Update password
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Two-factor authentication</CardTitle>
            {twoFactor && (
              <Badge tone={twoFactor.enabled ? 'success' : 'neutral'}>{twoFactor.enabled ? 'Enabled' : 'Disabled'}</Badge>
            )}
          </CardHeader>
          <CardBody>
            <TwoFactorSection
              enabled={!!twoFactor?.enabled}
              recoveryCodesLeft={twoFactor?.recovery_codes_left ?? 0}
              onChanged={() => qc.invalidateQueries({ queryKey: ['auth', '2fa'] })}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function TwoFactorSection({
  enabled,
  recoveryCodesLeft,
  onChanged,
}: {
  enabled: boolean
  recoveryCodesLeft: number
  onChanged: () => void
}) {
  const [setupOpen, setSetupOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)

  if (!enabled) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Add an extra layer of security — after enabling, you'll need a 6-digit code from your authenticator app to
          sign in.
        </p>
        <Button variant="outline" onClick={() => setSetupOpen(true)}>
          <ShieldCheck className="size-4" /> Enable
        </Button>
        <SetupDialog open={setupOpen} onClose={() => setSetupOpen(false)} onDone={onChanged} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-text-muted">
        Two-factor authentication is protecting your account. {recoveryCodesLeft} recovery codes remaining.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setRecoveryOpen(true)}>
          Regenerate recovery codes
        </Button>
        <Button variant="danger" onClick={() => setDisableOpen(true)}>
          <ShieldOff className="size-4" /> Disable
        </Button>
      </div>
      <RecoveryCodesDialog open={recoveryOpen} onClose={() => setRecoveryOpen(false)} />
      <DisableDialog open={disableOpen} onClose={() => setDisableOpen(false)} onDone={onChanged} />
    </div>
  )
}

function SetupDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<'password' | 'confirm' | 'codes'>('password')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState<{ secret: string; otpauth_uri: string } | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const reset = () => {
    setStep('password')
    setPassword('')
    setCode('')
    setSecret(null)
    setRecoveryCodes([])
    setError(null)
  }

  const startSetup = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await authApi.twoFactorSetup(password)
      setSecret(res)
      setStep('confirm')
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setPending(false)
    }
  }

  const confirmSetup = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await authApi.twoFactorConfirm(code)
      setRecoveryCodes(res.recovery_codes)
      setStep('codes')
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose()
        if (step === 'codes') onDone()
        reset()
      }}
      title="Enable two-factor authentication"
      footer={
        step === 'password' ? (
          <Button onClick={startSetup} loading={pending} disabled={!password}>
            Continue
          </Button>
        ) : step === 'confirm' ? (
          <Button onClick={confirmSetup} loading={pending} disabled={code.length < 6}>
            Verify code
          </Button>
        ) : (
          <Button
            onClick={() => {
              onClose()
              onDone()
              reset()
            }}
          >
            Done
          </Button>
        )
      }
    >
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {step === 'password' && (
        <FormField label="Confirm your password" required>
          <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
      )}
      {step === 'confirm' && secret && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Add this key to your authenticator app (Google Authenticator, Authy, 1Password…), then enter the 6-digit
            code it shows.
          </p>
          <code className="block break-all rounded-md bg-surface-2 px-3 py-2 text-xs text-text">{secret.secret}</code>
          <FormField label="Authentication code" required>
            <Input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </FormField>
        </div>
      )}
      {step === 'codes' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Save these recovery codes somewhere safe. Each can be used once if you lose access to your authenticator.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-2 p-3 font-mono text-sm">
            {recoveryCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function DisableDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      await authApi.twoFactorDisable({ password, code })
      onDone()
      onClose()
      setPassword('')
      setCode('')
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Disable two-factor authentication"
      description="This removes the extra sign-in step. You can re-enable it any time."
      footer={
        <Button variant="danger" onClick={submit} loading={pending} disabled={!password || code.length < 6}>
          Disable 2FA
        </Button>
      }
    >
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <div className="flex flex-col gap-4">
        <FormField label="Password" required>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
        <FormField label="Authentication code" required hint="Or a recovery code">
          <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} />
        </FormField>
      </div>
    </Modal>
  )
}

function RecoveryCodesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await authApi.twoFactorRecoveryCodes(code)
      setCodes(res.recovery_codes)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose()
        setCode('')
        setCodes(null)
        setError(null)
      }}
      title="Regenerate recovery codes"
      description="Your old recovery codes stop working once new ones are generated."
      footer={
        !codes && (
          <Button onClick={submit} loading={pending} disabled={code.length < 6}>
            Generate
          </Button>
        )
      }
    >
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {!codes ? (
        <FormField label="Authentication code" required>
          <Input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        </FormField>
      ) : (
        <div className="grid grid-cols-2 gap-2 rounded-md bg-surface-2 p-3 font-mono text-sm">
          {codes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      )}
    </Modal>
  )
}
