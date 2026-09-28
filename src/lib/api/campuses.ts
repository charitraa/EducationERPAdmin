import { createCrudApi } from './crud'

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

export const campusesApi = createCrudApi<Campus, CampusPayload>('/campuses/')
