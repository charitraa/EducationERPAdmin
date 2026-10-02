import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '../components/AuthLayout'

/** Target of a future reset email link; the endpoint doesn't exist yet. */
export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Reset your password" subtitle="Password reset links aren't sent yet.">
      <p className="mb-4 text-sm text-muted-foreground">If you followed a link here, ask your school's administrator to set a new password for you.</p>
      <Button asChild variant="outline" className="w-full">
        <Link to="/login">Back to sign in</Link>
      </Button>
    </AuthLayout>
  )
}
