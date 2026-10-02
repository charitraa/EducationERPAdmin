import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

/** A "section" in the API; a "class" in the UI (Grade 11 A). */
export type SchoolClass = Schema<'Section'>
export type SchoolClassInput = Schema<'SectionRequest'>

export const classesApi = createResourceApi<SchoolClass, SchoolClassInput>('/sections/')
export const classKeys = createQueryKeys('sections')
