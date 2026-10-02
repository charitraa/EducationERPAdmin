import { z } from 'zod'
import type { AcademicYear, AcademicYearInput } from '../api/academic-years.api'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')

export const academicYearSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the year a name, e.g. 2082/83.').max(50),
    start_date: isoDate,
    end_date: isoDate,
  })
  .refine((v) => v.end_date > v.start_date, { path: ['end_date'], message: 'The year must end after it starts.' })

export type AcademicYearForm = z.infer<typeof academicYearSchema>

export const academicYearDefaults = (r: AcademicYear | null): AcademicYearForm => ({
  name: r?.name ?? '',
  start_date: r?.start_date ?? '',
  end_date: r?.end_date ?? '',
})

export const toAcademicYearInput = (v: AcademicYearForm): AcademicYearInput => v
