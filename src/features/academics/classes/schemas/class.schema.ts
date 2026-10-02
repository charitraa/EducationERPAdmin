import { z } from 'zod'
import { optionalId, optionalWholeNumber, requiredId, toInt, toNullableInt } from '@/lib/validation'
import type { SchoolClass, SchoolClassInput } from '../api/classes.api'

export const classSchema = z.object({
  academic_year: requiredId('Choose the academic year.'),
  campus: requiredId('Choose the branch.'),
  program: requiredId('Choose the program.'),
  level: requiredId('Choose the level.'),
  name: z.string().trim().min(1, 'Usually a letter: A, B…').max(50),
  capacity: optionalWholeNumber,
  class_teacher: optionalId,
  home_room: optionalId,
})

export type ClassForm = z.infer<typeof classSchema>

export const classDefaults = (r: SchoolClass | null, d: { academicYear: number | null; campus: number | null }): ClassForm => ({
  academic_year: r ? String(r.academic_year) : d.academicYear ? String(d.academicYear) : '',
  campus: r ? String(r.campus) : d.campus ? String(d.campus) : '',
  program: r ? String(r.program) : '',
  level: r ? String(r.level) : '',
  name: r?.name ?? '',
  capacity: r?.capacity != null ? String(r.capacity) : '',
  class_teacher: r?.class_teacher ? String(r.class_teacher) : '',
  home_room: r?.home_room ? String(r.home_room) : '',
})

export const toClassInput = (v: ClassForm): SchoolClassInput => ({
  academic_year: toInt(v.academic_year),
  campus: toInt(v.campus),
  program: toInt(v.program),
  level: toInt(v.level),
  name: v.name,
  capacity: toNullableInt(v.capacity),
  class_teacher: toNullableInt(v.class_teacher),
  home_room: toNullableInt(v.home_room),
})
