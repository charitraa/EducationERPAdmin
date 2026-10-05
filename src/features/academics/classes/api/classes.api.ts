import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import { apiClient } from '@/shared/api/client'
import type { Id, Schema } from '@/shared/types/api'

/** A "section" in the API; a "class" in the UI (Grade 11 A). */
export type SchoolClass = Schema<'Section'>
export type SchoolClassInput = Schema<'SectionRequest'>

export const classesApi = createResourceApi<SchoolClass, SchoolClassInput>('/sections/')
export const classKeys = createQueryKeys('sections')

export type SectionStudent = Schema<'SectionStudent'>

/** The students in a class today (not paginated). */
export const sectionStudents = (id: Id) => apiClient.get<SectionStudent[]>(`/sections/${id}/students/`).then((r) => r.data)
