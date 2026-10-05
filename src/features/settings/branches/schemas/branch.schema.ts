import { z } from 'zod'
import { code } from '@/lib/validation'
import type { Campus, CampusInput } from '@/shared/types/organization'
import { tr } from '@/lib/i18n'

export const branchSchema = z.object({
  name: z.string().trim().min(1, tr('Required.')).max(200),
  code,
  email: z.union([z.literal(''), z.string().trim().email(tr('Enter a valid email.'))]),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  is_main: z.boolean(),
  is_active: z.boolean(),
})

export type BranchForm = z.infer<typeof branchSchema>

export const branchDefaults = (r: Campus | null): BranchForm => ({
  name: r?.name ?? '',
  code: r?.code ?? '',
  email: r?.email ?? '',
  phone: r?.phone ?? '',
  address: r?.address ?? '',
  city: r?.city ?? '',
  state: r?.state ?? '',
  country: r?.country ?? 'Nepal',
  is_main: r?.is_main ?? false,
  is_active: r?.is_active ?? true,
})

export const toBranchInput = (v: BranchForm): CampusInput => v
