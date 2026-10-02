import { z } from 'zod'

export const signupSchema = z
  .object({
    school_name: z.string().trim().min(2, 'Enter your school or college name.'),
    full_name: z.string().trim().min(2, 'Enter your name.'),
    email: z.string().trim().email('Enter a valid email.'),
    password: z.string().min(8, 'At least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: "Passwords don't match." })

export type SignupForm = z.infer<typeof signupSchema>
