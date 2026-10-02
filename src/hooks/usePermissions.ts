import { useMemo } from 'react'
import { satisfies, type PermissionRequirement } from '@/lib/permissions'
import { useAuth } from './useAuth'

export function usePermissions() {
  const { permissions } = useAuth()
  return useMemo(
    () => ({
      hasPermission: (code: string) => permissions.has(code),
      hasAnyPermission: (codes: readonly string[]) => codes.some((c) => permissions.has(c)),
      hasAllPermissions: (codes: readonly string[]) => codes.every((c) => permissions.has(c)),
      can: (req: PermissionRequirement | undefined) => satisfies(permissions, req),
    }),
    [permissions],
  )
}
