import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Student = Schema<'Student'>
export type StudentInput = Schema<'StudentRequest'>
export type StudentStatus = Schema<'StudentStatusEnum'>
export type StatusChangeInput = Schema<'StatusChangeRequest'>
export type PlacementInput = Schema<'PlacementRequest'>
export type TransferInput = Schema<'TransferRequest'>

/**
 * One stretch of a student at a campus and (once placed) in a class. The
 * OpenAPI file types `current_enrollment` as a bare object and the history
 * endpoint as a Student; this is the backend's EnrollmentSerializer.
 */
export interface Enrollment {
  id: Id
  campus: Id
  campus_name: string
  /** Empty until the student is placed in a class. */
  section: Id | null
  section_name: string | null
  program_name: string | null
  academic_year_name: string | null
  status: 'active' | 'completed' | 'transferred' | 'withdrawn' | 'moved'
  started_on: string
  ended_on: string | null
  end_reason: string
  created_at: string
}

export const ENROLLMENT_STATUS_LABELS: Record<Enrollment['status'], string> = {
  active: 'Current',
  completed: 'Completed',
  transferred: 'Transferred',
  withdrawn: 'Withdrawn',
  moved: 'Moved to another class',
}

export const currentEnrollment = (s: Pick<Student, 'current_enrollment'>) => s.current_enrollment as Enrollment | null

/** Active and suspended students have an open enrollment; graduated and withdrawn are final. */
export const isEnrolled = (status: string) => status === 'active' || status === 'suspended'

const base = createResourceApi<Student, StudentInput>('/students/')

export const studentsApi = {
  ...base,
  enrollments: (id: Id) => apiClient.get<Enrollment[]>(`${base.url(id)}enrollments/`).then((r) => r.data),
  changeStatus: (id: Id, input: StatusChangeInput) => apiClient.post<Student>(`${base.url(id)}change-status/`, input).then((r) => r.data),
  place: (id: Id, input: PlacementInput) => apiClient.post<Student>(`${base.url(id)}place/`, input).then((r) => r.data),
  transfer: (id: Id, input: TransferInput) => apiClient.post<Student>(`${base.url(id)}transfer/`, input).then((r) => r.data),
}

export const studentKeys = createQueryKeys('students')
