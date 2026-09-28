import type { Permission } from '@/lib/api/permissions'

const modules = [
  'organizations',
  'campuses',
  'users',
  'roles',
  'audit',
  'students',
  'staff',
  'parents',
  'admissions',
] as const

const actionLabels: Record<string, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  manage_roles: 'Manage roles',
}

function buildActions(mod: string): string[] {
  if (mod === 'audit') return ['view']
  if (mod === 'users') return ['view', 'create', 'update', 'manage_roles']
  return ['view', 'create', 'update']
}

let id = 1
export const mockPermissions: Permission[] = modules.flatMap((mod) =>
  buildActions(mod).map((action) => ({
    id: id++,
    code: `${mod}.${action}`,
    module: mod,
    action,
    name: `${actionLabels[action]} ${mod}`,
    description: `Allows the ${actionLabels[action].toLowerCase()} action on ${mod}.`,
  })),
)
