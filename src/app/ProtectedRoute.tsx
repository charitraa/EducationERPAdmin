import { CloudOff } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/components/data-display/LoadingState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage } from '@/lib/errors'
import { StatusPage } from '@/pages/StatusPage'

/** Signed-in users only; everyone else goes to /login and comes back after. */
export function ProtectedRoute() {
  const { status, user, retry, bootError } = useAuth()
  const location = useLocation()

  if (status === 'booting') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <PageLoader />
      </div>
    )
  }
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />
  // The session exists but couldn't be resumed or loaded (rate limit, server
  // down, offline): offer a retry instead of throwing the user out.
  if (status === 'unreachable' || !user) {
    return (
      <div className="min-h-dvh">
        <StatusPage icon={CloudOff} title="Can't reach the server" actions={<Button onClick={() => (status === 'unreachable' ? retry() : window.location.reload())}>Try again</Button>}>
          {bootError ? errorMessage(bootError) : 'Check your connection and try again.'}
        </StatusPage>
      </div>
    )
  }
  return <Outlet />
}
