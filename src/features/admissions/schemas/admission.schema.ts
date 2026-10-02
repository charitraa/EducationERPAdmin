import { z } from 'zod'
import { optionalIsoDate, requiredId } from '@/lib/validation'
import type { Id, Schema } from '@/shared/types/api'
import type { Admission, AdmissionInput } from '../api/admissions.api'

const text = (max: number, required = false) => (required ? z.string().trim().min(1, 'Required.').max(max) : z.string().trim().max(max))
const optionalEmail = z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')])

export const admissionSchema = z
  .object({
    application_number: text(32, true),
    applied_on: optionalIsoDate,
    applying_for: text(200),
    campus: requiredId('Choose a branch.'),
    first_name: text(150, true),
    middle_name: text(150),
    last_name: text(150, true),
    date_of_birth: optionalIsoDate,
    gender: z.enum(['', 'male', 'female', 'other', 'undisclosed']),
    email: optionalEmail,
    phone: text(32),
    address: z.string(),
    previous_school: text(200),
    guardian_first_name: text(150),
    guardian_last_name: text(150),
    guardian_relationship: z.string(),
    guardian_phone: text(32),
    guardian_email: optionalEmail,
  })
  // Enrolling creates the guardian as a parent only when they have a first name.
  .refine((v) => v.guardian_first_name || !(v.guardian_last_name || v.guardian_phone || v.guardian_email), {
    path: ['guardian_first_name'],
    message: 'Add the guardian’s first name, or clear their other details.',
  })

export type AdmissionForm = z.infer<typeof admissionSchema>

export const ADMISSION_FIELDS = Object.keys(admissionSchema.innerType().shape)

export const admissionDefaults = (r: Admission | null, campus: Id | null): AdmissionForm => ({
  application_number: r?.application_number ?? '',
  applied_on: r?.applied_on ?? '',
  applying_for: r?.applying_for ?? '',
  campus: r ? String(r.campus) : campus ? String(campus) : '',
  first_name: r?.first_name ?? '',
  middle_name: r?.middle_name ?? '',
  last_name: r?.last_name ?? '',
  date_of_birth: r?.date_of_birth ?? '',
  gender: (r?.gender as AdmissionForm['gender']) ?? '',
  email: r?.email ?? '',
  phone: r?.phone ?? '',
  address: r?.address ?? '',
  previous_school: r?.previous_school ?? '',
  guardian_first_name: r?.guardian_first_name ?? '',
  guardian_last_name: r?.guardian_last_name ?? '',
  guardian_relationship: r?.guardian_relationship ?? '',
  guardian_phone: r?.guardian_phone ?? '',
  guardian_email: r?.guardian_email ?? '',
})

export function toAdmissionInput(v: AdmissionForm): AdmissionInput {
  const { applied_on, ...rest } = v
  return {
    ...rest,
    campus: Number(v.campus),
    date_of_birth: v.date_of_birth || null,
    gender: v.gender as Schema<'GenderEnum'> | '',
    guardian_relationship: v.guardian_relationship as Schema<'RelationshipEnum'> | '',
    // Empty means "today" on the server.
    ...(applied_on ? { applied_on } : {}),
  } as AdmissionInput
}
