import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

/** One student taking one elective subject, in one class. Compulsory subjects aren't recorded. */
export type StudentElective = Schema<'StudentElective'>
/** `in_section` ties the choice to that class of the student's (e.g. next year's) instead of today's. */
export type StudentElectiveInput = { student: Id; subject: Id; in_section?: Id; started_on?: string }

export const electivesApi = createResourceApi<StudentElective, StudentElectiveInput>('/student-electives/')
export const electiveKeys = createQueryKeys('student-electives')
