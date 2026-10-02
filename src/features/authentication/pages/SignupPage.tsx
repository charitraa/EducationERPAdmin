import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthLayout } from '../components/AuthLayout'
import { signupSchema, type SignupForm } from '../schemas/signup.schema'

/**
 * Designed now, wired later: the backend has no sign-up endpoint yet
 * (organizations are created on the server). Submitting validates the form
 * and says so; nothing is sent.
 */
export default function SignupPage() {
  const [checked, setChecked] = useState(false)
  const form = useForm<SignupForm>({ resolver: zodResolver(signupSchema), defaultValues: { school_name: '', full_name: '', email: '', password: '', confirm: '' } })
  const { register, formState: { errors } } = form

  return (
    <AuthLayout
      title="Set up your school"
      subtitle="Free for schools and colleges. You'll verify your email, then the setup guide walks you through the rest."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(() => setChecked(true))} noValidate className="grid gap-4">
        {checked && (
          <div role="status" className="flex gap-2 rounded-md border border-info/20 bg-info-soft px-3 py-2 text-sm text-info">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>Online sign-up opens soon. Until then, contact us and we'll create your school's account for you.</p>
          </div>
        )}
        <FormField label="School or college name" required error={errors.school_name?.message}>
          <Input {...register('school_name')} autoFocus />
        </FormField>
        <FormField label="Your name" required error={errors.full_name?.message}>
          <Input {...register('full_name')} autoComplete="name" />
        </FormField>
        <FormField label="Email" required error={errors.email?.message} description="We'll send a verification link here.">
          <Input {...register('email')} type="email" autoComplete="email" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Password" required error={errors.password?.message}>
            <Input {...register('password')} type="password" autoComplete="new-password" />
          </FormField>
          <FormField label="Confirm password" required error={errors.confirm?.message}>
            <Input {...register('confirm')} type="password" autoComplete="new-password" />
          </FormField>
        </div>
        <Button type="submit" className="h-10">
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
