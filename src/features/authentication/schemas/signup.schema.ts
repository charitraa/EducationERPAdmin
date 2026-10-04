import { z } from 'zod'

/** Mirrors the backend's organization `code_validator`. */
export const ORG_CODE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

export const signupSchema = z
  .object({
    organization_name: z.string().trim().min(2, 'Enter your school or college name.').max(200),
    organization_code: z
      .string()
      .trim()
      .min(2, 'At least 2 characters.')
      .max(50)
      .regex(ORG_CODE, 'Lowercase letters, digits and hyphens; start and end with a letter or digit.'),
    organization_type: z.string().min(1, 'Choose a type.'),
    timezone: z.string().trim().min(1, 'Choose a time zone.'),
    first_name: z.string().trim().min(1, 'Enter your first name.').max(150),
    last_name: z.string().trim().max(150),
    email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email.'),
    phone: z.string().trim().max(32),
    password: z.string().min(8, 'At least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: "Passwords don't match." })

export type SignupForm = z.infer<typeof signupSchema>

/** "St. Xavier's College, Maitighar" → "st-xaviers-college-maitighar". */
export function suggestCode(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '')
}
