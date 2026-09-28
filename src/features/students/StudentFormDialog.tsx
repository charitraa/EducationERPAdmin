import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { useCampuses } from '@/features/campuses/hooks'
import { useCreateStudent } from './hooks'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'
import type { Gender } from '@/lib/api/students'

const GENDERS: Gender[] = ['male', 'female', 'other', 'undisclosed']

const schema = z.object({
  student_number: z.string().min(1, 'Required'),
  first_name: z.string().min(1, 'Required'),
  middle_name: z.string(),
  last_name: z.string().min(1, 'Required'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string(),
  address: z.string(),
  campus: z.coerce.number().min(1, 'Required'),
  admitted_on: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function StudentFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: campuses } = useCampuses({ page_size: 200 })
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      student_number: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'undisclosed',
      email: '',
      phone: '',
      address: '',
      admitted_on: '',
    },
  })

  const create = useCreateStudent()

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        ...values,
        email: values.email ?? '',
        date_of_birth: values.date_of_birth || null,
        admitted_on: values.admitted_on || null,
        user: null,
      })
      toast({ title: 'Student created', variant: 'success' })
      onClose()
      reset()
    } catch (err) {
      toast({ title: 'Could not create student', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New student"
      size="lg"
      footer={
        <Button type="submit" form="student-form" loading={create.isPending}>
          Create student
        </Button>
      }
    >
      <form id="student-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Student number" required error={errors.student_number?.message}>
            <Input {...register('student_number')} />
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
          <FormField label="Admitted on">
            <Input type="date" {...register('admitted_on')} />
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
      </form>
    </Modal>
  )
}
