import { api } from './client'
import { createCrudApi } from './crud'
import { env } from '@/config/env'
import { createMockCrudApi, mockAware } from '@/mocks/mock-crud'
import { mockStaff } from '@/mocks/data/staff'
import type { Gender } from './students'
import type { ListParams, PaginatedEnvelope } from './types'

export type StaffType = 'teaching' | 'non_teaching'
export type StaffStatus = 'active' | 'on_leave' | 'left'

export interface StaffMember {
  id: number
  organization: number
  employee_number: string
  first_name: string
  middle_name: string
  last_name: string
  full_name: string
  date_of_birth: string | null
  gender: Gender
  email: string
  phone: string
  address: string
  campus: number
  campus_name: string
  staff_type: StaffType
  designation: string
  status: StaffStatus
  joined_on: string | null
  left_on: string | null
  user: number | null
  created_at: string
  updated_at: string
}

export type StaffPayload = Omit<StaffMember, 'id' | 'organization' | 'full_name' | 'campus_name' | 'created_at' | 'updated_at'>

const store = mockStaff
const base = env.useMocks
  ? createMockCrudApi<StaffMember, StaffPayload>(store, ['full_name', 'employee_number', 'email'])
  : createCrudApi<StaffMember, StaffPayload>('/staff/')

export interface StaffListParams extends ListParams {
  campus?: number
  staff_type?: StaffType
  status?: StaffStatus
}

export const staffApi = {
  ...base,
  list: (params?: StaffListParams) =>
    mockAware<PaginatedEnvelope<StaffMember>>(
      env.useMocks,
      () => base.list(params),
      () => api.get<PaginatedEnvelope<StaffMember>>('/staff/', { params }).then((r) => r.data),
    ),
  me: () =>
    mockAware<StaffMember>(env.useMocks, () => Promise.resolve(store[0]), () => api.get<StaffMember>('/staff/me/').then((r) => r.data)),
}
