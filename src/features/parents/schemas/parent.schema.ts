import { z } from 'zod'
import type { Parent, ParentInput } from '../api/parents.api'

const text = (max: number) => z.string().trim().max(max)

export const parentSchema = z.object({
  first_name: z.string().trim().min(1, 'Required.').max(150),
  middle_name: text(150),
  last_name: text(150),
  phone: text(32),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')]),
  occupation: text(150),
  address: z.string(),
})

export type ParentForm = z.infer<typeof parentSchema>

export const parentDefaults = (r: Parent | null): ParentForm => ({
  first_name: r?.first_name ?? '',
  middle_name: r?.middle_name ?? '',
  last_name: r?.last_name ?? '',
  phone: r?.phone ?? '',
  email: r?.email ?? '',
  occupation: r?.occupation ?? '',
  address: r?.address ?? '',
})

export const toParentInput = (v: ParentForm): ParentInput => v
