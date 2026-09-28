import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { Checkbox } from '@/components/ui/Checkbox'
import type { Campus } from '@/lib/api/campuses'
import { useCreateCampus, useUpdateCampus } from './hooks'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  code: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  is_main: z.boolean(),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function CampusFormDialog({
  open,
  onClose,
  campus,
}: {
  open: boolean
  onClose: () => void
  campus?: Campus | null
}) {
  const isEdit = !!campus
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: campus
      ? {
          name: campus.name,
          code: campus.code,
          email: campus.email,
          phone: campus.phone,
          address: campus.address,
          city: campus.city,
          state: campus.state,
          country: campus.country,
          is_main: campus.is_main,
          is_active: campus.is_active,
        }
      : {
          name: '',
          code: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          country: '',
          is_main: false,
          is_active: true,
        },
  })

  const create = useCreateCampus()
  const update = useUpdateCampus()
  const pending = create.isPending || update.isPending

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = { ...values, email: values.email ?? '' }
      if (isEdit) {
        await update.mutateAsync({ id: campus.id, payload })
        toast({ title: 'Campus updated', variant: 'success' })
      } else {
        await create.mutateAsync(payload)
        toast({ title: 'Campus created', variant: 'success' })
      }
      onClose()
      reset()
    } catch (err) {
      toast({ title: 'Save failed', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit campus' : 'New campus'}
      footer={
        <Button type="submit" form="campus-form" loading={pending}>
          {isEdit ? 'Save changes' : 'Create campus'}
        </Button>
      }
    >
      <form id="campus-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name" required error={errors.name?.message}>
            <Input {...register('name')} />
          </FormField>
          <FormField label="Code" required error={errors.code?.message}>
            <Input {...register('code')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" {...register('email')} />
          </FormField>
          <FormField label="Phone">
            <Input {...register('phone')} />
          </FormField>
        </div>
        <FormField label="Address">
          <Input {...register('address')} />
        </FormField>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="City">
            <Input {...register('city')} />
          </FormField>
          <FormField label="State">
            <Input {...register('state')} />
          </FormField>
          <FormField label="Country">
            <Input {...register('country')} />
          </FormField>
        </div>
        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-sm text-text">
            <Checkbox {...register('is_main')} /> Main campus
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <Checkbox {...register('is_active')} /> Active
          </label>
        </div>
      </form>
    </Modal>
  )
}
