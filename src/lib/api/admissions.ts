import { api } from './client'
import { createCrudApi } from './crud'
import { env } from '@/config/env'
import { createMockCrudApi, mockAware } from '@/mocks/mock-crud'
import { mockAdmissions } from '@/mocks/data/admissions'
import type { Gender } from './students'
import type { ListParams, PaginatedEnvelope } from './types'

export type AdmissionStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'enrolled'

/** modules/admissions/services.py:_ALLOWED_FROM — which actions are valid from which status. */
export const ADMISSION_ACTIONS: Record<AdmissionStatus, ('approve' | 'reject' | 'withdraw' | 'enroll')[]> = {
  pending: ['approve', 'reject', 'withdraw'],
  approved: ['enroll', 'withdraw'],
  rejected: [],
  withdrawn: [],
  enrolled: [],
}

export interface Admission {
  id: number
  organization: number
  application_number: string
  applied_on: string | null
  applying_for: string
  campus: number
  campus_name: string
  first_name: string
  middle_name: string
  last_name: string
  full_name: string
  date_of_birth: string | null
  gender: Gender
  email: string
  phone: string
  address: string
  previous_school: string
  guardian_first_name: string
  guardian_last_name: string
  guardian_relationship: string
  guardian_phone: string
  guardian_email: string
  status: AdmissionStatus
  decided_at: string | null
  decided_by: number | null
  decision_note: string
  student: number | null
  created_at: string
  updated_at: string
}

export type AdmissionPayload = Omit<
  Admission,
  | 'id'
  | 'organization'
  | 'campus_name'
  | 'full_name'
  | 'status'
  | 'decided_at'
  | 'decided_by'
  | 'decision_note'
  | 'student'
  | 'created_at'
  | 'updated_at'
>

const store = mockAdmissions
const base = env.useMocks
  ? createMockCrudApi<Admission, AdmissionPayload>(store, ['full_name', 'application_number'])
  : createCrudApi<Admission, AdmissionPayload>('/admissions/')

export interface AdmissionListParams extends ListParams {
  campus?: number
  status?: AdmissionStatus
}

function mockDecide(id: number, status: AdmissionStatus, note: string | undefined): Promise<Admission> {
  const idx = store.findIndex((a) => a.id === id)
  if (idx === -1) throw new Error(`Not found (mock id ${id})`)
  store[idx] = { ...store[idx], status, decided_at: new Date().toISOString(), decision_note: note ?? '' }
  return Promise.resolve(store[idx])
}

export const admissionsApi = {
  ...base,
  list: (params?: AdmissionListParams) =>
    mockAware<PaginatedEnvelope<Admission>>(
      env.useMocks,
      () => base.list(params),
      () => api.get<PaginatedEnvelope<Admission>>('/admissions/', { params }).then((r) => r.data),
    ),
  approve: (id: number, note?: string) =>
    mockAware<Admission>(
      env.useMocks,
      () => mockDecide(id, 'approved', note),
      () => api.post<Admission>(`/admissions/${id}/approve/`, { note }).then((r) => r.data),
    ),
  reject: (id: number, note: string) =>
    mockAware<Admission>(
      env.useMocks,
      () => mockDecide(id, 'rejected', note),
      () => api.post<Admission>(`/admissions/${id}/reject/`, { note }).then((r) => r.data),
    ),
  enroll: (id: number, payload: { student_number: string; started_on?: string }) =>
    mockAware<Admission>(
      env.useMocks,
      () => {
        const idx = store.findIndex((a) => a.id === id)
        if (idx === -1) throw new Error(`Not found (mock id ${id})`)
        store[idx] = { ...store[idx], status: 'enrolled', decided_at: new Date().toISOString(), student: 999000 + id }
        return Promise.resolve(store[idx])
      },
      () => api.post<Admission>(`/admissions/${id}/enroll/`, payload).then((r) => r.data),
    ),
  withdraw: (id: number, note?: string) =>
    mockAware<Admission>(
      env.useMocks,
      () => mockDecide(id, 'withdrawn', note),
      () => api.post<Admission>(`/admissions/${id}/withdraw/`, { note }).then((r) => r.data),
    ),
}
