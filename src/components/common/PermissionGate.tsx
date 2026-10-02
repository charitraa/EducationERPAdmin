import type { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionRequirement } from '@/lib/permissions'

interface PermissionGateProps {
  /** One code, `{ any: [...] }` or `{ all: [...] }`. */
  permission: PermissionRequirement
  children: ReactNode
  fallback?: ReactNode
}

/** Renders children only when the user holds the permission. UX only: the server decides. */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { can } = usePermissions()
  return <>{can(permission) ? children : fallback}</>
}
