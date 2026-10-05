import { z } from 'zod'
import { optionalIsoDate, requiredId } from '@/lib/validation'
import type { Id, Schema } from '@/shared/types/api'
import type { Student, StudentInput } from '../api/students.api'
import { tr } from '@/lib/i18n'

const name = (required: boolean) => (required ? z.string().trim().min(1, tr('Required.')).max(150) : z.string().trim().max(150))

export const studentSchema = z.object({
  student_number: z.string().trim().min(1, tr('Required.')).max(32),
  first_name: name(true),
  middle_name: name(false),
  last_name: name(true),
  date_of_birth: optionalIsoDate,
  gender: z.enum(['', 'male', 'female', 'other', 'undisclosed']),
  email: z.union([z.literal(''), z.string().trim().email(tr('Enter a valid email address.'))]),
  phone: z.string().trim().max(32),
  address: z.string(),
  campus: requiredId(tr('Choose a branch.')),
  admitted_on: optionalIsoDate,
})

export type StudentForm = z.infer<typeof studentSchema>

/** Form fields, for putting the server's 400 details on the right input. */
export const STUDENT_FIELDS = Object.keys(studentSchema.shape)

export const studentDefaults = (r: Student | null | undefined, campus: Id | null): StudentForm => ({
  student_number: r?.student_number ?? '',
  first_name: r?.first_name ?? '',
  middle_name: r?.middle_name ?? '',
  last_name: r?.last_name ?? '',
  date_of_birth: r?.date_of_birth ?? '',
  gender: (r?.gender as StudentForm['gender']) ?? '',
  email: r?.email ?? '',
  phone: r?.phone ?? '',
  address: r?.address ?? '',
  campus: r ? String(r.campus) : campus ? String(campus) : '',
  admitted_on: r?.admitted_on ?? '',
})

/**
 * Branch and admission date are set once, at creation: a branch change is a
 * transfer, and the first enrollment starts on the admission date.
 */
export function toStudentInput(v: StudentForm, creating: boolean): StudentInput {
  const { campus, admitted_on, ...rest } = v
  return {
    ...rest,
    date_of_birth: v.date_of_birth || null,
    gender: v.gender as Schema<'GenderEnum'> | '',
    ...(creating ? { campus: Number(campus), ...(admitted_on ? { admitted_on } : {}) } : {}),
  } as StudentInput
}
