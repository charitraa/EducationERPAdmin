import { api } from './client'
import { createCrudApi } from './crud'
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

const base = createCrudApi<Parent, ParentPayload>('/parents/')

export interface ParentListParams extends ListParams {
  student?: number
}

export const parentsApi = {
  ...base,
  list: (params?: ParentListParams) => api.get<PaginatedEnvelope<Parent>>('/parents/', { params }).then((r) => r.data),
  me: () => api.get<ParentWithChildren>('/parents/me/').then((r) => r.data),
  students: (id: number, params?: ListParams) =>
    api.get<PaginatedEnvelope<Child>>(`/parents/${id}/students/`, { params }).then((r) => r.data),
  linkStudent: (id: number, payload: { student: number; relationship: GuardianRelationship; is_primary_contact?: boolean }) =>
    api.post<Child>(`/parents/${id}/link-student/`, payload).then((r) => r.data),
  unlinkStudent: (id: number, student: number) => api.post(`/parents/${id}/unlink-student/`, { student }),
}
