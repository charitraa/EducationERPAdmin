import { describe, expect, it } from 'vitest'
import { createPermissionSet, satisfies } from './permissions'

const user = (permissions: string[], is_superuser = false) => ({ permissions, is_superuser })

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
})
