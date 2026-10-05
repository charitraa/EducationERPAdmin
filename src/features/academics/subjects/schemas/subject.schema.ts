import { z } from 'zod'
import { code, optionalId, toNullableInt } from '@/lib/validation'
import type { Subject, SubjectInput } from '../api/subjects.api'
import { tr } from '@/lib/i18n'

export const subjectSchema = z.object({
  code,
  name: z.string().trim().min(1, tr('Required.')).max(200),
  department: optionalId,
  // Decimal string, never a float: up to 999.9.
  credit_hours: z.union([z.literal(''), z.string().trim().regex(/^\d{1,3}(\.\d)?$/, tr('A number like 3 or 4.5.'))]),
  description: z.string(),
})

export type SubjectForm = z.infer<typeof subjectSchema>

export const subjectDefaults = (r: Subject | null): SubjectForm => ({
  code: r?.code ?? '',
  name: r?.name ?? '',
  department: r?.department ? String(r.department) : '',
  credit_hours: r?.credit_hours ?? '',
  description: r?.description ?? '',
})

export const toSubjectInput = (v: SubjectForm): SubjectInput => ({
  ...v,
  department: toNullableInt(v.department),
  credit_hours: v.credit_hours === '' ? null : v.credit_hours,
})
