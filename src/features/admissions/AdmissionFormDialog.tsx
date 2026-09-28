import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { useCampuses } from '@/features/campuses/hooks'
import { useCreateAdmission } from './hooks'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'
import type { Gender } from '@/lib/api/students'

const GENDERS: Gender[] = ['male', 'female', 'other', 'undisclosed']
const RELATIONSHIPS = ['father', 'mother', 'guardian', 'other'] as const

const schema = z.object({
  application_number: z.string().min(1, 'Required'),
  applied_on: z.string().optional(),
  applying_for: z.string().min(1, 'Required'),
  campus: z.coerce.number().min(1, 'Required'),
  first_name: z.string().min(1, 'Required'),
  middle_name: z.string(),
  last_name: z.string().min(1, 'Required'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string(),
  address: z.string(),
  previous_school: z.string().optional(),
  guardian_first_name: z.string().min(1, 'Required'),
  guardian_last_name: z.string().min(1, 'Required'),
  guardian_relationship: z.string().min(1, 'Required'),
  guardian_phone: z.string(),
  guardian_email: z.string().email().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

export function AdmissionFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: campuses } = useCampuses({ page_size: 200 })
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      application_number: '',
      applied_on: '',
      applying_for: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'undisclosed',
      email: '',
      phone: '',
      address: '',
      previous_school: '',
      guardian_first_name: '',
      guardian_last_name: '',
      guardian_relationship: 'guardian',
      guardian_phone: '',
      guardian_email: '',
    },
  })

  const create = useCreateAdmission()

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        ...values,
        email: values.email ?? '',
        guardian_email: values.guardian_email ?? '',
        previous_school: values.previous_school ?? '',
        date_of_birth: values.date_of_birth || null,
        applied_on: values.applied_on || null,
      })
      toast({ title: 'Application created', variant: 'success' })
      onClose()
      reset()
    } catch (err) {
      toast({ title: 'Could not create application', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New admission application"
      size="lg"
      footer={
        <Button type="submit" form="admission-form" loading={create.isPending}>
          Create application
        </Button>
      }
    >
      <form id="admission-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Application #" required error={errors.application_number?.message}>
            <Input {...register('application_number')} />
          </FormField>
          <FormField label="Applying for" required error={errors.applying_for?.message} hint="e.g. Grade 5, Semester 1">
            <Input {...register('applying_for')} />
          </FormField>
          <FormField label="Campus" required error={errors.campus?.message}>
            <Select {...register('campus')} defaultValue="">
              <option value="" disabled>Select a campus…</option>
              {campuses?.results.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">Applicant</p>
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
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Date of birth">
            <Input type="date" {...register('date_of_birth')} />
          </FormField>
          <FormField label="Gender" required>
            <Select {...register('gender')}>
              {GENDERS.map((g) => (
                <option key={g} value={g} className="capitalize">{g}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Applied on">
            <Input type="date" {...register('applied_on')} />
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
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Address">
            <Input {...register('address')} />
          </FormField>
          <FormField label="Previous school">
            <Input {...register('previous_school')} />
          </FormField>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">Guardian</p>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="First name" required error={errors.guardian_first_name?.message}>
            <Input {...register('guardian_first_name')} />
          </FormField>
          <FormField label="Last name" required error={errors.guardian_last_name?.message}>
            <Input {...register('guardian_last_name')} />
          </FormField>
          <FormField label="Relationship" required>
            <Select {...register('guardian_relationship')}>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone">
            <Input {...register('guardian_phone')} />
          </FormField>
          <FormField label="Email" error={errors.guardian_email?.message}>
            <Input type="email" {...register('guardian_email')} />
          </FormField>
        </div>
      </form>
    </Modal>
  )
}
