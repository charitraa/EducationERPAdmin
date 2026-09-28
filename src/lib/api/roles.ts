import { createCrudApi } from './crud'

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

export const rolesApi = createCrudApi<Role, RolePayload>('/roles/')
