import type { CurrentUser } from '@/shared/types/auth'

/**
 * Permission checks are UX only: they decide what to show. The backend checks
 * every request again and has the final word.
 */
export type PermissionRequirement =
  | string
  | { any: readonly string[] }
  | { all: readonly string[] }

export interface PermissionSet {
  has(code: string): boolean
}

/**
 * Not a backend permission: screens only the platform's own admins may open
 * (a superuser with no organization, the backend's `IsPlatformAdmin`).
 */
export const PLATFORM_ADMIN = '@platform'

export function createPermissionSet(user: Pick<CurrentUser, 'permissions' | 'is_superuser' | 'organization'> | null): PermissionSet {
  if (!user) return { has: () => false }
  const platform = user.is_superuser && !user.organization
  // Superusers pass every backend permission check.
  if (user.is_superuser) return { has: (code) => code !== PLATFORM_ADMIN || platform }
  const codes = new Set(user.permissions)
  return { has: (code) => code !== PLATFORM_ADMIN && codes.has(code) }
}

export function satisfies(set: PermissionSet, req: PermissionRequirement | undefined): boolean {
  if (req === undefined) return true
  if (typeof req === 'string') return set.has(req)
  if ('any' in req) return req.any.some((c) => set.has(c))
  return req.all.every((c) => set.has(c))
}
