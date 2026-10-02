import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

/** Who teaches which subject to which class (section). Timetable lessons and attendance hang off these. */
export type TeachingAssignment = Schema<'TeachingAssignment'>
export type TeachingAssignmentInput = Schema<'TeachingAssignmentRequest'>

export const teachingApi = createResourceApi<TeachingAssignment, TeachingAssignmentInput>('/teaching-assignments/')
export const teachingKeys = createQueryKeys('teaching-assignments')
