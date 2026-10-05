import { z } from 'zod'
import { code, optionalId, toInt, toNullableInt, wholeNumber } from '@/lib/validation'
import type { Schema } from '@/shared/types/api'
import type { Program, ProgramInput } from '../api/programs.api'
import { tr } from '@/lib/i18n'

export const programSchema = z
  .object({
    code,
    name: z.string().trim().min(1, tr('Required.')).max(200),
    department: optionalId,
    level_type: z.enum(['grade', 'semester', 'year', 'trimester']),
    first_level: wholeNumber(),
    last_level: wholeNumber(),
    attendance_mode: z.enum(['daily', 'lesson']),
    description: z.string(),
    is_active: z.boolean(),
  })
  .refine((v) => Number(v.last_level) >= Number(v.first_level), { path: ['last_level'], message: tr('Must be the same as or after the first level.') })

export type ProgramForm = z.infer<typeof programSchema>

export const programDefaults = (r: Program | null): ProgramForm => ({
  code: r?.code ?? '',
  name: r?.name ?? '',
  department: r?.department ? String(r.department) : '',
  level_type: (r?.level_type as ProgramForm['level_type']) ?? 'grade',
  first_level: String(r?.first_level ?? 1),
  last_level: String(r?.last_level ?? 1),
  attendance_mode: (r?.attendance_mode as ProgramForm['attendance_mode']) ?? 'daily',
  description: r?.description ?? '',
  is_active: r?.is_active ?? true,
})

export const toProgramInput = (v: ProgramForm): ProgramInput => ({
  ...v,
  department: toNullableInt(v.department),
  first_level: toInt(v.first_level),
  last_level: toInt(v.last_level),
  attendance_mode: v.attendance_mode as Schema<'AttendanceModeEnum'>,
})
