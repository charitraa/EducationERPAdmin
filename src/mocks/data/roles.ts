import type { Role } from '@/lib/api/roles'
import { mockPermissions } from './permissions'

const allCodes = mockPermissions.map((p) => p.code)
const viewOnly = mockPermissions.filter((p) => p.action === 'view').map((p) => p.code)

export const mockRoles: Role[] = [
  {
    id: 1,
    organization: null,
    organization_name: null,
    code: 'org-admin',
    name: 'Organization Admin',
    description: 'Full access across the organization. Re-expanded on every permission sync.',
    is_system: true,
    permissions: allCodes,
    assigned_user_count: 2,
    created_at: '2023-04-12T04:15:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
  {
    id: 2,
    organization: null,
    organization_name: null,
    code: 'campus-admin',
    name: 'Campus Admin',
    description: 'Manage a single campus: students, staff, admissions.',
    is_system: true,
    permissions: allCodes.filter((c) => !c.startsWith('organizations.')),
    assigned_user_count: 3,
    created_at: '2023-04-12T04:15:00Z',
    updated_at: '2023-04-12T04:15:00Z',
  },
  {
    id: 3,
    organization: null,
    organization_name: null,
    code: 'staff',
    name: 'Staff',
    description: 'Teaching and non-teaching staff — read access to rosters.',
    is_system: true,
    permissions: viewOnly,
    assigned_user_count: 8,
    created_at: '2023-04-12T04:15:00Z',
    updated_at: '2023-04-12T04:15:00Z',
  },
  {
    id: 4,
    organization: 1,
    organization_name: 'Greenwood International School',
    code: 'admissions-officer',
    name: 'Admissions Officer',
    description: 'Reviews and decides on admission applications.',
    is_system: false,
    permissions: ['admissions.view', 'admissions.create', 'admissions.update', 'students.view', 'campuses.view'],
    assigned_user_count: 1,
    created_at: '2023-09-01T04:15:00Z',
    updated_at: '2023-09-01T04:15:00Z',
  },
]
