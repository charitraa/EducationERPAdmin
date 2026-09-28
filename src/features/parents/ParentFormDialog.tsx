import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { useCreateParent } from './hooks'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'

const schema = z.object({
  first_name: z.string().min(1, 'Required'),
  middle_name: z.string(),
  last_name: z.string().min(1, 'Required'),
  phone: z.string(),
  email: z.string().email().optional().or(z.literal('')),
  occupation: z.string().optional(),
  address: z.string(),
})

type FormValues = z.infer<typeof schema>

export function ParentFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', middle_name: '', last_name: '', phone: '', email: '', occupation: '', address: '' },
  })

  const create = useCreateParent()

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({ ...values, email: values.email ?? '', occupation: values.occupation ?? '', user: null })
      toast({ title: 'Parent created', variant: 'success' })
      onClose()
      reset()
    } catch (err) {
      toast({ title: 'Could not create parent', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New parent"
      footer={
        <Button type="submit" form="parent-form" loading={create.isPending}>
          Create parent
        </Button>
      }
    >
      <form id="parent-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <FormField label="First name" required error={errors.first_name?.message}>
            <Input {...register('first_name')} />
          </FormField>
          <FormField label="Middle name">
            <Input {...register('middle_name')} />
          </FormField>
          <FormField label="Last name" required error={errors.last_name?.message}>
            <Input {...register('last_name')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone">
            <Input {...register('phone')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" {...register('email')} />
          </FormField>
        </div>
        <FormField label="Occupation">
          <Input {...register('occupation')} />
        </FormField>
        <FormField label="Address">
          <Input {...register('address')} />
        </FormField>
      </form>
    </Modal>
  )
}
