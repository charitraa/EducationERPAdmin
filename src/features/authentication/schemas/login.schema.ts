import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
  /** A 6-digit app code or a recovery code; only sent once the server asks. */
  otp: z.string().trim(),
})

export type LoginForm = z.infer<typeof loginSchema>
