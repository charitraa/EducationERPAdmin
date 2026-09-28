import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import type { UserType } from '@/lib/api/types'
import { useCreateUser } from './hooks'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'

const schema = z.object({
  email: z.string().min(1, 'Required').email('Enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'At least 8 characters'),
  first_name: z.string().min(1, 'Required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Required'),
  user_type: z.enum(['student', 'parent', 'teacher', 'staff', 'administrator']),
})

type FormValues = z.infer<typeof schema>

const USER_TYPES: UserType[] = ['administrator', 'staff', 'teacher', 'parent', 'student']

export function UserFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', phone: '', password: '', first_name: '', middle_name: '', last_name: '', user_type: 'staff' },
  })

  const create = useCreateUser()

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({ ...values, is_active: true })
      toast({ title: 'User created', variant: 'success' })
      onClose()
      reset()
    } catch (err) {
      toast({ title: 'Could not create user', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New user"
      description="Roles are assigned after the account is created."
      footer={
        <Button type="submit" form="user-form" loading={create.isPending}>
          Create user
        </Button>
      }
    >
      <form id="user-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First name" required error={errors.first_name?.message}>
            <Input {...register('first_name')} />
          </FormField>
          <FormField label="Last name" required error={errors.last_name?.message}>
            <Input {...register('last_name')} />
          </FormField>
        </div>
        <FormField label="Middle name">
          <Input {...register('middle_name')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" required error={errors.email?.message}>
            <Input type="email" {...register('email')} />
          </FormField>
          <FormField label="Phone">
            <Input {...register('phone')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Temporary password" required error={errors.password?.message}>
            <Input type="password" {...register('password')} />
          </FormField>
          <FormField label="User type" required>
            <Select {...register('user_type')}>
              {USER_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </form>
    </Modal>
  )
}
