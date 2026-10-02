import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionRequirement } from '@/lib/permissions'
import Forbidden from '@/pages/Forbidden'

/**
 * Route-level guard with the same requirement as the menu item. Hiding a menu
 * item isn't protection; this stops a typed-in URL too. The server still checks.
 */
export function PermissionRoute({ permission, children }: { permission?: PermissionRequirement; children?: ReactNode }) {
  const { can } = usePermissions()
  if (!can(permission)) return <Forbidden />
  return <>{children ?? <Outlet />}</>
}
