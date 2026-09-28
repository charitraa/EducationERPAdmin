import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GraduationCap, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { useLogin } from './useAuth'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const login = useLogin()
  const [otpRequired, setOtpRequired] = useState(false)
  const [otp, setOtp] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setFormError(null)
    setPending(true)
    const result = await login({ ...values, otp: otpRequired ? otp : undefined })
    setPending(false)
    if (!result.ok) {
      if (result.error.code === 'otp_required') {
        setOtpRequired(true)
        return
      }
      setFormError(result.error.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-accent text-white">
            <GraduationCap className="size-6" />
          </div>
          <h1 className="text-lg font-semibold text-text">Education ERP</h1>
          <p className="mt-1 text-sm text-text-muted">Sign in to your campus account</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-lg border border-border bg-surface p-6 shadow-sm"
        >
          {formError && (
            <div className="mb-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
              {formError}
            </div>
          )}

          {!otpRequired ? (
            <div className="flex flex-col gap-4">
              <FormField label="Email" required error={errors.email?.message}>
                <Input type="email" autoComplete="email" autoFocus {...register('email')} />
              </FormField>
              <FormField label="Password" required error={errors.password?.message}>
                <Input type="password" autoComplete="current-password" {...register('password')} />
              </FormField>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
                <ShieldCheck className="size-4 shrink-0" />
                <span>Enter the code from your authenticator app for {getValues('email')}.</span>
              </div>
              <FormField label="Authentication code" required>
                <Input
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                />
              </FormField>
            </div>
          )}

          <Button type="submit" className="mt-6 w-full" loading={pending}>
            {otpRequired ? 'Verify & sign in' : 'Sign in'}
          </Button>

          {otpRequired && (
            <button
              type="button"
              onClick={() => {
                setOtpRequired(false)
                setOtp('')
              }}
              className="mt-3 w-full text-center text-sm text-text-muted hover:text-text"
            >
              Back
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
