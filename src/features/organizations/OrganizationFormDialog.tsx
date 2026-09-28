import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { Checkbox } from '@/components/ui/Checkbox'
import type { Organization, OrganizationType } from '@/lib/api/organizations'
import { useCreateOrganization, useUpdateOrganization } from './hooks'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  code: z.string().min(1, 'Required'),
  legal_name: z.string().optional(),
  type: z.enum(['school', 'college', 'university', 'institute', 'other']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string(),
  website: z.string(),
  address: z.string(),
  timezone: z.string(),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const ORG_TYPES: OrganizationType[] = ['school', 'college', 'university', 'institute', 'other']

export function OrganizationFormDialog({
  open,
  onClose,
  organization,
}: {
  open: boolean
  onClose: () => void
  organization?: Organization | null
}) {
  const isEdit = !!organization
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: organization
      ? {
          name: organization.name,
          code: organization.code,
          legal_name: organization.legal_name,
          type: organization.type,
          email: organization.email,
          phone: organization.phone,
          website: organization.website,
          address: organization.address,
          timezone: organization.timezone,
          is_active: organization.is_active,
        }
      : {
          name: '',
          code: '',
          legal_name: '',
          type: 'school',
          email: '',
          phone: '',
          website: '',
          address: '',
          timezone: 'Asia/Kathmandu',
          is_active: true,
        },
  })

  const create = useCreateOrganization()
  const update = useUpdateOrganization()
  const pending = create.isPending || update.isPending

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = { ...values, legal_name: values.legal_name ?? '', email: values.email ?? '' }
      if (isEdit) {
        await update.mutateAsync({ id: organization.id, payload })
        toast({ title: 'Organization updated', variant: 'success' })
      } else {
        await create.mutateAsync(payload)
        toast({ title: 'Organization created', variant: 'success' })
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
      title={isEdit ? 'Edit organization' : 'New organization'}
      footer={
        <Button type="submit" form="org-form" loading={pending}>
          {isEdit ? 'Save changes' : 'Create organization'}
        </Button>
      }
    >
      <form id="org-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name" required error={errors.name?.message}>
            <Input {...register('name')} />
          </FormField>
          <FormField label="Code" required error={errors.code?.message} hint="Short unique identifier">
            <Input {...register('code')} />
          </FormField>
        </div>
        <FormField label="Legal name">
          <Input {...register('legal_name')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Type" required>
            <Select {...register('type')}>
              {ORG_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Timezone">
            <Input {...register('timezone')} />
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
        <FormField label="Website">
          <Input {...register('website')} />
        </FormField>
        <FormField label="Address">
          <Input {...register('address')} />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-text">
          <Checkbox {...register('is_active')} /> Active
        </label>
      </form>
    </Modal>
  )
}
