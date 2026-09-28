import type { CurrentUser } from '@/lib/api/types'

/** Superuser so every PermissionGate/PermissionRoute passes — the point of
 * dummy-data mode is to see every page, not to exercise the permission model. */
export const mockCurrentUser: CurrentUser = {
  id: 1,
  email: 'aarav.shrestha@greenwoodschool.edu.np',
  phone: '+977-9801122334',
  first_name: 'Aarav',
  middle_name: '',
  last_name: 'Shrestha',
  full_name: 'Aarav Shrestha',
  user_type: 'administrator',
  is_active: true,
  is_superuser: true,
  organization: { id: 1, name: 'Greenwood International School', code: 'greenwood' },
  roles: [{ code: 'org-admin', name: 'Organization Admin', campus: null }],
  permissions: [],
  last_login: '2026-01-15T02:10:00Z',
  date_joined: '2023-04-12T04:20:00Z',
}

export const mockTwoFactorStatus = { enabled: false, pending_setup: false, recovery_codes_left: 0 }
