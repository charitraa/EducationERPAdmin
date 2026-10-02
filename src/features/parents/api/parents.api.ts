import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Parent = Schema<'Parent'>
export type ParentInput = Schema<'ParentRequest'>
/** A student as seen through a parent link. */
export type Child = Schema<'Child'>
export type LinkStudentInput = Schema<'LinkStudentRequest'>
export type Relationship = Schema<'RelationshipEnum'>

const base = createResourceApi<Parent, ParentInput>('/parents/')

export const parentsApi = {
  ...base,
  /** A plain list (the OpenAPI file says paginated; the view returns every link). */
  children: (id: Id) => apiClient.get<Child[]>(`${base.url(id)}students/`).then((r) => r.data),
  linkStudent: (id: Id, input: LinkStudentInput) => apiClient.post<Child>(`${base.url(id)}link-student/`, input).then((r) => r.data),
  unlinkStudent: (id: Id, student: Id) => apiClient.post(`${base.url(id)}unlink-student/`, { student }).then(() => undefined),
}

export const parentKeys = createQueryKeys('parents')
