import { createCrudApi } from './crud'
import { env } from '@/config/env'
import { createMockCrudApi } from '@/mocks/mock-crud'
import { mockCampuses } from '@/mocks/data/campuses'

export interface Campus {
  id: number
  organization: number
  organization_name: string
  name: string
  code: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  is_main: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CampusPayload = Omit<
  Campus,
  'id' | 'organization' | 'organization_name' | 'created_at' | 'updated_at'
> & { organization?: number }

export const campusesApi = env.useMocks
  ? createMockCrudApi<Campus, CampusPayload>(mockCampuses, ['name', 'code', 'city'])
  : createCrudApi<Campus, CampusPayload>('/campuses/')
