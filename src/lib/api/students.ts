import { api } from './client'
import { createCrudApi } from './crud'
import { env } from '@/config/env'
import { createMockCrudApi, mockAware } from '@/mocks/mock-crud'
import { mockEnrollments, mockStudents } from '@/mocks/data/students'
import { mockCampuses } from '@/mocks/data/campuses'
import type { ListParams, PaginatedEnvelope } from './types'

export type Gender = 'male' | 'female' | 'other' | 'undisclosed'
export type StudentStatus = 'active' | 'suspended' | 'graduated' | 'withdrawn'

/** modules/students/services.py:ALLOWED_TRANSITIONS */
export const STUDENT_STATUS_TRANSITIONS: Record<StudentStatus, StudentStatus[]> = {
  active: ['suspended', 'graduated', 'withdrawn'],
  suspended: ['active', 'withdrawn'],
  graduated: [],
  withdrawn: [],
}

export interface EnrollmentRef {
  id: number
  section: number | null
  section_name?: string
  status: string
  started_on: string
  ended_on: string | null
}

export interface Student {
  id: number
  organization: number
  student_number: string
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
  status: StudentStatus
  admitted_on: string | null
  user: number | null
  current_enrollment: EnrollmentRef | null
  created_at: string
  updated_at: string
}

export type StudentPayload = Omit<
  Student,
  'id' | 'organization' | 'full_name' | 'campus_name' | 'status' | 'current_enrollment' | 'created_at' | 'updated_at'
>

const store = mockStudents
const base = env.useMocks
  ? createMockCrudApi<Student, StudentPayload>(store, ['full_name', 'student_number', 'email'])
  : createCrudApi<Student, StudentPayload>('/students/')

export interface StudentListParams extends ListParams {
  campus?: number
  gender?: Gender
  status?: StudentStatus
}

export const studentsApi = {
  ...base,
  list: (params?: StudentListParams) =>
    mockAware<PaginatedEnvelope<Student>>(
      env.useMocks,
      () => base.list(params),
      () => api.get<PaginatedEnvelope<Student>>('/students/', { params }).then((r) => r.data),
    ),
  me: () =>
    mockAware<Student>(env.useMocks, () => Promise.resolve(store[0]), () => api.get<Student>('/students/me/').then((r) => r.data)),
  changeStatus: (id: number, payload: { status: StudentStatus; on_date?: string; reason?: string }) =>
    mockAware<Student>(
      env.useMocks,
      () => {
        const idx = store.findIndex((s) => s.id === id)
        if (idx === -1) throw new Error(`Not found (mock id ${id})`)
        store[idx] = {
          ...store[idx],
          status: payload.status,
          current_enrollment: payload.status === 'active' ? store[idx].current_enrollment : null,
        }
        return Promise.resolve(store[idx])
      },
      () => api.post<Student>(`/students/${id}/change-status/`, payload).then((r) => r.data),
    ),
  enrollments: (id: number) =>
    mockAware<EnrollmentRef[]>(
      env.useMocks,
      () => Promise.resolve(mockEnrollments[id] ?? []),
      () => api.get<EnrollmentRef[]>(`/students/${id}/enrollments/`).then((r) => r.data),
    ),
  place: (id: number, payload: { section: number; on_date?: string; reason?: string; allow_over_capacity?: boolean }) =>
    mockAware<Student>(
      env.useMocks,
      () => Promise.resolve(store.find((s) => s.id === id) ?? store[0]),
      () => api.post<Student>(`/students/${id}/place/`, payload).then((r) => r.data),
    ),
  transfer: (id: number, payload: { campus: number; on_date?: string; reason?: string }) =>
    mockAware<Student>(
      env.useMocks,
      () => {
        const idx = store.findIndex((s) => s.id === id)
        if (idx === -1) throw new Error(`Not found (mock id ${id})`)
        const campus = mockCampuses.find((c) => c.id === payload.campus)
        store[idx] = { ...store[idx], campus: payload.campus, campus_name: campus?.name ?? store[idx].campus_name }
        return Promise.resolve(store[idx])
      },
      () => api.post<Student>(`/students/${id}/transfer/`, payload).then((r) => r.data),
    ),
}
