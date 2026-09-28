// Shared API envelope types. Backend: core/common/pagination.py + core/common/exceptions.py

export interface PaginatedEnvelope<T> {
  count: number
  total_pages: number
  page: number
  page_size: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiErrorBody {
  code: string
  message: string
  details: Record<string, unknown> | { non_field_errors: string[] } | null
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody
}

export type UserType = 'student' | 'parent' | 'teacher' | 'staff' | 'administrator'

export interface OrganizationRef {
  id: number
  name: string
  code: string
}

export interface RoleRef {
  code: string
  name: string
  campus: string | null
}

export interface CurrentUser {
  id: number
  email: string
  phone: string
  first_name: string
  middle_name: string
  last_name: string
  full_name: string
  user_type: UserType
  is_active: boolean
  is_superuser: boolean
  organization: OrganizationRef | null
  roles: RoleRef[]
  permissions: string[]
  last_login: string | null
  date_joined: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: CurrentUser
}

export interface ListParams {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  [key: string]: string | number | boolean | undefined
}
