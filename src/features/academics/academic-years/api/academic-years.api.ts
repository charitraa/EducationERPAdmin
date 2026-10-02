import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type AcademicYear = Schema<'AcademicYear'>
export type AcademicYearInput = Schema<'AcademicYearRequest'>

export const academicYearKeys = createQueryKeys('academic-years')

export const academicYearsApi = {
  ...createResourceApi<AcademicYear, AcademicYearInput>('/academic-years/'),
  setCurrent: (id: Id) => apiClient.post<AcademicYear>(`/academic-years/${id}/set-current/`).then((r) => r.data),
}
