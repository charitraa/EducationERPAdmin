import { z } from 'zod'
import { tr } from '@/lib/i18n'

export const loginSchema = z.object({
  email: z.string().trim().min(1, tr('Enter your email.')).email(tr('Enter a valid email.')),
  password: z.string().min(1, tr('Enter your password.')),
  /** A 6-digit app code or a recovery code; only sent once the server asks. */
  otp: z.string().trim(),
})

export type LoginForm = z.infer<typeof loginSchema>
