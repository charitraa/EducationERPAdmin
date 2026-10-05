import { z } from 'zod'
import { isoDate, requiredId, toInt, wholeNumber } from '@/lib/validation'
import type { Term, TermInput } from '../api/terms.api'
import { tr } from '@/lib/i18n'

export const termSchema = z
  .object({
    academic_year: requiredId(tr('Choose the academic year.')),
    name: z.string().trim().min(1, tr('Required.')).max(100),
    sequence: wholeNumber(),
    start_date: isoDate,
    end_date: isoDate,
  })
  .refine((v) => v.end_date > v.start_date, { path: ['end_date'], message: tr('The term must end after it starts.') })

export type TermForm = z.infer<typeof termSchema>

export const termDefaults = (r: Term | null, defaults: { academicYear?: number | null; nextSequence?: number } = {}): TermForm => ({
  academic_year: r ? String(r.academic_year) : defaults.academicYear ? String(defaults.academicYear) : '',
  name: r?.name ?? '',
  sequence: String(r?.sequence ?? defaults.nextSequence ?? 1),
  start_date: r?.start_date ?? '',
  end_date: r?.end_date ?? '',
})

export const toTermInput = (v: TermForm): TermInput => ({ ...v, academic_year: toInt(v.academic_year), sequence: toInt(v.sequence) })
