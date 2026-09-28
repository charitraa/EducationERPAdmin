import { api } from './client'
import { createCrudApi } from './crud'
import { env } from '@/config/env'
import { createMockCrudApi, mockAware } from '@/mocks/mock-crud'
import { mockPaginate } from '@/mocks/pagination'
import { mockParentChildren, mockParents } from '@/mocks/data/parents'
import { mockStudents } from '@/mocks/data/students'
import type { ListParams, PaginatedEnvelope } from './types'

export type GuardianRelationship = 'father' | 'mother' | 'guardian' | 'other'

export interface Child {
  student: number
  student_number: string
  full_name: string
  campus_name: string
  status: string
  relationship: GuardianRelationship
  is_primary_contact: boolean
}

export interface Parent {
  id: number
  organization: number
  first_name: string
  middle_name: string
  last_name: string
  full_name: string
  phone: string
  email: string
  occupation: string
  address: string
  user: number | null
  created_at: string
  updated_at: string
}

export interface ParentWithChildren extends Parent {
  children: Child[]
}

export type ParentPayload = Omit<Parent, 'id' | 'organization' | 'full_name' | 'created_at' | 'updated_at'>

const base = env.useMocks
  ? createMockCrudApi<Parent, ParentPayload>(mockParents, ['full_name', 'email'])
  : createCrudApi<Parent, ParentPayload>('/parents/')

export interface ParentListParams extends ListParams {
  student?: number
}

export const parentsApi = {
  ...base,
  list: (params?: ParentListParams) =>
    mockAware<PaginatedEnvelope<Parent>>(
      env.useMocks,
      () => base.list(params),
      () => api.get<PaginatedEnvelope<Parent>>('/parents/', { params }).then((r) => r.data),
    ),
  me: () =>
    mockAware<ParentWithChildren>(
      env.useMocks,
      () => Promise.resolve({ ...mockParents[0], children: mockParentChildren[mockParents[0].id] ?? [] }),
      () => api.get<ParentWithChildren>('/parents/me/').then((r) => r.data),
    ),
  students: (id: number, params?: ListParams) =>
    mockAware<PaginatedEnvelope<Child>>(
      env.useMocks,
      () => Promise.resolve(mockPaginate(mockParentChildren[id] ?? [], params)),
      () => api.get<PaginatedEnvelope<Child>>(`/parents/${id}/students/`, { params }).then((r) => r.data),
    ),
  linkStudent: (id: number, payload: { student: number; relationship: GuardianRelationship; is_primary_contact?: boolean }) =>
    mockAware<Child>(
      env.useMocks,
      () => {
        const student = mockStudents.find((s) => s.id === payload.student)
        const child: Child = {
          student: payload.student,
          student_number: student?.student_number ?? '',
          full_name: student?.full_name ?? 'Unknown student',
          campus_name: student?.campus_name ?? '',
          status: student?.status ?? 'active',
          relationship: payload.relationship,
          is_primary_contact: payload.is_primary_contact ?? false,
        }
        mockParentChildren[id] = [...(mockParentChildren[id] ?? []), child]
        return Promise.resolve(child)
      },
      () => api.post<Child>(`/parents/${id}/link-student/`, payload).then((r) => r.data),
    ),
  unlinkStudent: (id: number, student: number) =>
    mockAware<void>(
      env.useMocks,
      () => {
        mockParentChildren[id] = (mockParentChildren[id] ?? []).filter((c) => c.student !== student)
        return Promise.resolve()
      },
      () => api.post(`/parents/${id}/unlink-student/`, { student }).then(() => undefined),
    ),
}
