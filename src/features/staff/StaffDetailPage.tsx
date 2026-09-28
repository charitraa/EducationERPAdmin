import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'
import type { Gender } from '@/lib/api/students'
import type { StaffStatus, StaffType } from '@/lib/api/staff'
import { useStaffMember, useUpdateStaffMember } from './hooks'

const GENDERS: Gender[] = ['male', 'female', 'other', 'undisclosed']
const STAFF_TYPES: StaffType[] = ['teaching', 'non_teaching']
const STATUSES: StaffStatus[] = ['active', 'on_leave', 'left']

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
  staff_type: z.enum(['teaching', 'non_teaching']),
  designation: z.string().optional(),
  status: z.enum(['active', 'on_leave', 'left']),
  joined_on: z.string().optional(),
  left_on: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const staffId = Number(id)
  const navigate = useNavigate()

  const { data: staff, isLoading } = useStaffMember(staffId)
  const update = useUpdateStaffMember()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: staff
      ? {
          employee_number: staff.employee_number,
          first_name: staff.first_name,
          middle_name: staff.middle_name,
          last_name: staff.last_name,
          date_of_birth: staff.date_of_birth ?? '',
          gender: staff.gender,
          email: staff.email,
          phone: staff.phone,
          address: staff.address,
          staff_type: staff.staff_type,
          designation: staff.designation,
          status: staff.status,
          joined_on: staff.joined_on ?? '',
          left_on: staff.left_on ?? '',
        }
      : undefined,
  })

  if (isLoading || !staff) return <Spinner />

  const statusValue = watch('status')

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: staffId,
        payload: {
          ...values,
          email: values.email ?? '',
          designation: values.designation ?? '',
          date_of_birth: values.date_of_birth || null,
          joined_on: values.joined_on || null,
          left_on: values.left_on || null,
          campus: staff.campus,
          user: staff.user,
        },
      })
      toast({ title: 'Staff member updated', variant: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <div>
      <button onClick={() => navigate('/staff')} className="mb-3 flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Back to staff
      </button>

      <PageHeader
        title={staff.full_name}
        description={`${staff.employee_number} · ${staff.campus_name}`}
        actions={<StatusBadge status={staff.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Staff details</CardTitle>
          </CardHeader>
          <CardBody>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Employee number" required error={errors.employee_number?.message}>
                  <Input {...register('employee_number')} />
                </FormField>
                <FormField label="Staff type" required>
                  <Select {...register('staff_type')}>
                    {STAFF_TYPES.map((t) => (
                      <option key={t} value={t}>{t === 'teaching' ? 'Teaching' : 'Non-teaching'}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Designation">
                  <Input {...register('designation')} />
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
              <div className="grid grid-cols-4 gap-4">
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
                <FormField label="Status" required>
                  <Select {...register('status')}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Joined on">
                  <Input type="date" {...register('joined_on')} />
                </FormField>
              </div>
              {statusValue === 'left' && (
                <FormField label="Left on">
                  <Input type="date" {...register('left_on')} />
                </FormField>
              )}
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
              <p className="text-xs text-text-faint">
                Joined {formatDate(staff.joined_on)}{staff.left_on ? ` · Left ${formatDate(staff.left_on)}` : ''}
              </p>
              <div>
                <Button type="submit" loading={update.isPending}>
                  Save changes
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
