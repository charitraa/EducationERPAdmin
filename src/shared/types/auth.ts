import type { Schema } from './api'

export interface RoleAssignment {
  code: string
  name: string
  /** Branch name when the role is limited to one branch; null when organization-wide. */
  campus: string | null
}

export interface OrganizationRef {
  id: number
  name: string
  code: string
}

/** `GET /auth/me/`. `organization` and `roles` are typed loosely in the OpenAPI file. */
export type CurrentUser = Omit<Schema<'CurrentUser'>, 'organization' | 'roles'> & {
  organization: OrganizationRef | null
  roles: RoleAssignment[]
}

export type UserType = Schema<'UserTypeEnum'>

export interface TokenPair {
  access: string
  refresh: string
}

export interface LoginResponse extends TokenPair {
  user: CurrentUser
}

export type LoginRequest = Schema<'LoginRequest'>
