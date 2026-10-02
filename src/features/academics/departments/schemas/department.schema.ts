import { z } from 'zod'
import { code, optionalId, toNullableInt } from '@/lib/validation'
import type { Department, DepartmentInput } from '../api/departments.api'

export const departmentSchema = z.object({
  code,
  name: z.string().trim().min(1, 'Required.').max(200),
  description: z.string(),
  head: optionalId,
})

export type DepartmentForm = z.infer<typeof departmentSchema>

export const departmentDefaults = (r: Department | null): DepartmentForm => ({
  code: r?.code ?? '',
  name: r?.name ?? '',
  description: r?.description ?? '',
  head: r?.head ? String(r.head) : '',
})

export const toDepartmentInput = (v: DepartmentForm): DepartmentInput => ({ ...v, head: toNullableInt(v.head) })
