import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { useCampuses } from '@/features/campuses/hooks'
import { useCreateStaffMember } from './hooks'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'
import type { Gender } from '@/lib/api/students'
import type { StaffType } from '@/lib/api/staff'

const GENDERS: Gender[] = ['male', 'female', 'other', 'undisclosed']
const STAFF_TYPES: StaffType[] = ['teaching', 'non_teaching']

const schema = z.object({
  employee_number: z.string().min(1, 'Required'),
  first_name: z.string().min(1, 'Required'),
  middle_name: z.string(),
  last_name: z.string().min(1, 'Required'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string(),
  address: z.string(),
  campus: z.coerce.number().min(1, 'Required'),
  staff_type: z.enum(['teaching', 'non_teaching']),
  designation: z.string().optional(),
  joined_on: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function StaffFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: campuses } = useCampuses({ page_size: 200 })
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_number: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'undisclosed',
      email: '',
      phone: '',
      address: '',
      staff_type: 'teaching',
      designation: '',
      joined_on: '',
    },
  })

  const create = useCreateStaffMember()

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        ...values,
        email: values.email ?? '',
        designation: values.designation ?? '',
        date_of_birth: values.date_of_birth || null,
        joined_on: values.joined_on || null,
        left_on: null,
        status: 'active',
        user: null,
      })
      toast({ title: 'Staff member created', variant: 'success' })
      onClose()
      reset()
    } catch (err) {
      toast({ title: 'Could not create staff member', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New staff member"
      size="lg"
      footer={
        <Button type="submit" form="staff-form" loading={create.isPending}>
          Create staff member
        </Button>
      }
    >
      <form id="staff-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Employee number" required error={errors.employee_number?.message}>
            <Input {...register('employee_number')} />
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
          <FormField label="Joined on">
            <Input type="date" {...register('joined_on')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Staff type" required>
            <Select {...register('staff_type')}>
              {STAFF_TYPES.map((t) => (
                <option key={t} value={t}>{t === 'teaching' ? 'Teaching' : 'Non-teaching'}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Designation" hint="e.g. Senior Teacher, Accountant">
            <Input {...register('designation')} />
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
