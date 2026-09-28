import { createCrudApi } from './crud'
import { env } from '@/config/env'
import { createMockCrudApi } from '@/mocks/mock-crud'
import { mockOrganizations } from '@/mocks/data/organizations'

export type OrganizationType = 'school' | 'college' | 'university' | 'institute' | 'other'

export interface Organization {
  id: number
  name: string
  code: string
  legal_name: string
  type: OrganizationType
  email: string
  phone: string
  website: string
  address: string
  timezone: string
  is_active: boolean
  campus_count: number
  created_at: string
  updated_at: string
}

export type OrganizationPayload = Omit<Organization, 'id' | 'campus_count' | 'created_at' | 'updated_at'>

export const organizationsApi = env.useMocks
  ? createMockCrudApi<Organization, OrganizationPayload>(mockOrganizations, ['name', 'code', 'legal_name'])
  : createCrudApi<Organization, OrganizationPayload>('/organizations/')
