import { z } from 'zod'
import type { Organization, OrganizationUpdate } from '@/shared/types/organization'

const optionalEmail = z.union([z.literal(''), z.string().trim().email('Enter a valid email.')])
const optionalUrl = z.union([z.literal(''), z.string().trim().url('Include https://, e.g. https://school.edu.np')])

export const organizationSchema = z.object({
  name: z.string().trim().min(1, 'Your school needs a name.'),
  legal_name: z.string(),
  type: z.enum(['school', 'college', 'university', 'institute', 'other']),
  email: optionalEmail,
  phone: z.string(),
  website: optionalUrl,
  address: z.string(),
  timezone: z.string(),
})

export type OrganizationForm = z.infer<typeof organizationSchema>
export const ORGANIZATION_FIELDS = Object.keys(organizationSchema.shape) as Array<keyof OrganizationForm>

export const organizationDefaults = (o: Organization | undefined): OrganizationForm => ({
  name: o?.name ?? '',
  legal_name: o?.legal_name ?? '',
  type: (o?.type as OrganizationForm['type']) ?? 'school',
  email: o?.email ?? '',
  phone: o?.phone ?? '',
  website: o?.website ?? '',
  address: o?.address ?? '',
  timezone: o?.timezone ?? 'Asia/Kathmandu',
})

export const toOrganizationInput = (v: OrganizationForm): OrganizationUpdate => v

/** Step 1 of setup counts as done once the school has an address and a way to contact it. */
export const hasSchoolDetails = (o: Organization | undefined) => Boolean(o?.address && (o.phone || o.email))
