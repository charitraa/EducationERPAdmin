import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { Spinner } from '@/components/ui/Spinner'

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status)

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading your workspace…" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function PermissionRoute({ any }: { any: string[] }) {
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission)
  if (!hasAnyPermission(any)) return <Navigate to="/" replace />
  return <Outlet />
}
