import { enumLabel } from '@/lib/formatters'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type Program = Schema<'Program'>
export type ProgramInput = Schema<'ProgramRequest'>

export const programsApi = createResourceApi<Program, ProgramInput>('/programs/')
export const programKeys = createQueryKeys('programs')

/** Same wording as the backend's `level_label`: "Grade 11", "Semester 3". */
export function levelLabel(program: Pick<Program, 'level_type'> | undefined, level: number) {
  return `${enumLabel('LevelTypeEnum', program?.level_type ?? 'grade')} ${level}`
}

/** The levels a program runs, e.g. [11, 12]. */
export function programLevels(program: Pick<Program, 'first_level' | 'last_level'> | undefined): number[] {
  if (!program) return []
  const first = program.first_level ?? 1
  const last = Math.max(program.last_level ?? first, first)
  return Array.from({ length: Math.min(last - first + 1, 40) }, (_, i) => first + i)
}
