import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'

/** Hides children unless the current user has at least one of the given permission codes. */
export function PermissionGate({ any, children }: { any: string[]; children: ReactNode }) {
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission)
  if (!hasAnyPermission(any)) return null
  return <>{children}</>
}
