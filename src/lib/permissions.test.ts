import { describe, expect, it } from 'vitest'
import { createPermissionSet, PLATFORM_ADMIN, satisfies } from './permissions'

const user = (permissions: string[], is_superuser = false, organization: { id: number; name: string; code: string } | null = null) => ({ permissions, is_superuser, organization })

describe('permissions', () => {
  it('checks single, any and all requirements', () => {
    const set = createPermissionSet(user(['students.view', 'staff.view']))
    expect(satisfies(set, 'students.view')).toBe(true)
    expect(satisfies(set, 'students.create')).toBe(false)
    expect(satisfies(set, { any: ['finance.view', 'staff.view'] })).toBe(true)
    expect(satisfies(set, { all: ['students.view', 'finance.view'] })).toBe(false)
    expect(satisfies(set, undefined)).toBe(true)
  })

  it('never infers permission from anything but the list', () => {
    expect(satisfies(createPermissionSet(null), 'students.view')).toBe(false)
    expect(satisfies(createPermissionSet(user([], true)), 'anything.at_all')).toBe(true)
  })

  it('opens platform screens only to a superuser without an organization', () => {
    const org = { id: 1, name: 'LBEF', code: 'lbef' }
    expect(satisfies(createPermissionSet(user([], true)), PLATFORM_ADMIN)).toBe(true)
    expect(satisfies(createPermissionSet(user([], true, org)), PLATFORM_ADMIN)).toBe(false)
    expect(satisfies(createPermissionSet(user([PLATFORM_ADMIN], false, org)), PLATFORM_ADMIN)).toBe(false)
  })
})
