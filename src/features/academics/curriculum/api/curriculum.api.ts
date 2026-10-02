import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type CurriculumEntry = Schema<'CurriculumSubject'>
export type CurriculumEntryInput = Schema<'CurriculumSubjectRequest'>

export const curriculumApi = createResourceApi<CurriculumEntry, CurriculumEntryInput>('/curriculum/')
export const curriculumKeys = createQueryKeys('curriculum')
