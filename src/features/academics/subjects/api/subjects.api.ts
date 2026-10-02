import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type Subject = Schema<'Subject'>
export type SubjectInput = Schema<'SubjectRequest'>

export const subjectsApi = createResourceApi<Subject, SubjectInput>('/subjects/')
export const subjectKeys = createQueryKeys('subjects')
