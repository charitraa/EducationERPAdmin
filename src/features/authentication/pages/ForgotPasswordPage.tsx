import { KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '../components/AuthLayout'

/**
 * The backend has no self-service password reset yet (only change-password
 * while signed in), so this page explains what to do instead of pretending
 * to send an email.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Forgot your password?">
      <div className="grid gap-4">
        <div className="flex gap-3 rounded-md border bg-muted/40 p-4 text-sm">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <p>
            Reset by email isn't available yet. Ask your school's administrator or office to set a new password for you. Once you're signed in, you can
            change it from your profile.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  )
}
