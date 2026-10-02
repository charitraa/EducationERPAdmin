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

export function createPermissionSet(user: Pick<CurrentUser, 'permissions' | 'is_superuser'> | null): PermissionSet {
  if (!user) return { has: () => false }
  // Platform superusers pass every backend permission check.
  if (user.is_superuser) return { has: () => true }
  const codes = new Set(user.permissions)
  return { has: (code) => codes.has(code) }
}

export function satisfies(set: PermissionSet, req: PermissionRequirement | undefined): boolean {
  if (req === undefined) return true
  if (typeof req === 'string') return set.has(req)
  if ('any' in req) return req.any.some((c) => set.has(c))
  return req.all.every((c) => set.has(c))
}
