import { z } from 'zod'
import { optionalIsoDate, requiredId } from '@/lib/validation'
import type { Id, Schema } from '@/shared/types/api'
import type { StaffMember, StaffMemberInput } from '../api/staff.api'

const text = (max: number, required = false) => (required ? z.string().trim().min(1, 'Required.').max(max) : z.string().trim().max(max))

/**
 * Profile and employment details. Status (on leave, left) changes from the
 * staff member's page, where leaving is checked against their teaching duties.
 */
export const staffSchema = z.object({
  employee_number: text(32, true),
  first_name: text(150, true),
  middle_name: text(150),
  last_name: text(150, true),
  date_of_birth: optionalIsoDate,
  gender: z.enum(['', 'male', 'female', 'other', 'undisclosed']),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')]),
  phone: text(32),
  address: z.string(),
  campus: requiredId('Choose a branch.'),
  staff_type: z.enum(['teaching', 'non_teaching']),
  designation: text(100),
  joined_on: optionalIsoDate,
})

export type StaffForm = z.infer<typeof staffSchema>

export const STAFF_FIELDS = Object.keys(staffSchema.shape)

export const staffDefaults = (r: StaffMember | null | undefined, campus: Id | null): StaffForm => ({
  employee_number: r?.employee_number ?? '',
  first_name: r?.first_name ?? '',
  middle_name: r?.middle_name ?? '',
  last_name: r?.last_name ?? '',
  date_of_birth: r?.date_of_birth ?? '',
  gender: (r?.gender as StaffForm['gender']) ?? '',
  email: r?.email ?? '',
  phone: r?.phone ?? '',
  address: r?.address ?? '',
  campus: r ? String(r.campus) : campus ? String(campus) : '',
  staff_type: (r?.staff_type as StaffForm['staff_type']) ?? 'teaching',
  designation: r?.designation ?? '',
  joined_on: r?.joined_on ?? '',
})

export function toStaffInput(v: StaffForm): StaffMemberInput {
  return {
    ...v,
    campus: Number(v.campus),
    date_of_birth: v.date_of_birth || null,
    joined_on: v.joined_on || null,
    gender: v.gender as Schema<'GenderEnum'> | '',
  } as StaffMemberInput
}
