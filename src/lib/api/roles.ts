import { createCrudApi } from './crud'
import { env } from '@/config/env'
import { createMockCrudApi } from '@/mocks/mock-crud'
import { mockRoles } from '@/mocks/data/roles'

export interface Role {
  id: number
  organization: number | null
  organization_name: string | null
  code: string
  name: string
  description: string
  is_system: boolean
  permissions: string[]
  assigned_user_count: number
  created_at: string
  updated_at: string
}

export interface RolePayload {
  code: string
  name: string
  description: string
  permissions: string[]
}

export const rolesApi = env.useMocks
  ? createMockCrudApi<Role, RolePayload>(mockRoles, ['name', 'code', 'description'])
  : createCrudApi<Role, RolePayload>('/roles/')
