import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRightLeft, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { PermissionGate } from '@/components/common/PermissionGate'
import { useCampuses } from '@/features/campuses/hooks'
import { formatDate } from '@/lib/utils'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'
import { STUDENT_STATUS_TRANSITIONS, type Gender, type StudentStatus } from '@/lib/api/students'
import { useChangeStudentStatus, useStudent, useStudentEnrollments, useTransferStudent, useUpdateStudent } from './hooks'

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
  admitted_on: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)
  const navigate = useNavigate()

  const { data: student, isLoading } = useStudent(studentId)
  const { data: enrollments } = useStudentEnrollments(studentId)
  const update = useUpdateStudent()

  const [statusOpen, setStatusOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: student
      ? {
          student_number: student.student_number,
          first_name: student.first_name,
          middle_name: student.middle_name,
          last_name: student.last_name,
          date_of_birth: student.date_of_birth ?? '',
          gender: student.gender,
          email: student.email,
          phone: student.phone,
          address: student.address,
          admitted_on: student.admitted_on ?? '',
        }
      : undefined,
  })

  if (isLoading || !student) return <Spinner />

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: studentId,
        payload: {
          ...values,
          email: values.email ?? '',
          date_of_birth: values.date_of_birth || null,
          admitted_on: values.admitted_on || null,
          campus: student.campus,
          user: student.user,
        },
      })
      toast({ title: 'Student updated', variant: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <div>
      <button
        onClick={() => navigate('/students')}
        className="mb-3 flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" /> Back to students
      </button>

      <PageHeader
        title={student.full_name}
        description={`${student.student_number} · ${student.campus_name}`}
        actions={
          <>
            <StatusBadge status={student.status} />
            <PermissionGate any={['students.update']}>
              <Button variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="size-4" /> Transfer campus
              </Button>
              <Button variant="outline" onClick={() => setStatusOpen(true)}>
                <RefreshCw className="size-4" /> Change status
              </Button>
            </PermissionGate>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student details</CardTitle>
          </CardHeader>
          <CardBody>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Student number" required error={errors.student_number?.message}>
                  <Input {...register('student_number')} />
                </FormField>
                <FormField label="Gender" required>
                  <Select {...register('gender')}>
                    {GENDERS.map((g) => (
                      <option key={g} value={g} className="capitalize">{g}</option>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Date of birth">
                  <Input type="date" {...register('date_of_birth')} />
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
              <div>
                <Button type="submit" loading={update.isPending}>
                  Save changes
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment history</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {!enrollments || enrollments.length === 0 ? (
              <EmptyState title="No enrollments yet" />
            ) : (
              enrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded border border-border-soft px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-text">{e.section_name ?? 'Unplaced'}</p>
                    <p className="text-xs text-text-muted">
                      {formatDate(e.started_on)} – {e.ended_on ? formatDate(e.ended_on) : 'present'}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <ChangeStatusDialog open={statusOpen} onClose={() => setStatusOpen(false)} studentId={studentId} currentStatus={student.status} />
      <TransferDialog open={transferOpen} onClose={() => setTransferOpen(false)} studentId={studentId} currentCampus={student.campus} />
    </div>
  )
}

function ChangeStatusDialog({
  open,
  onClose,
  studentId,
  currentStatus,
}: {
  open: boolean
  onClose: () => void
  studentId: number
  currentStatus: StudentStatus
}) {
  const [status, setStatus] = useState<StudentStatus | ''>('')
  const [reason, setReason] = useState('')
  const [onDate, setOnDate] = useState('')
  const changeStatus = useChangeStudentStatus()

  const allowed = STUDENT_STATUS_TRANSITIONS[currentStatus]

  const reset = () => {
    setStatus('')
    setReason('')
    setOnDate('')
  }

  const submit = async () => {
    if (!status) return
    try {
      await changeStatus.mutateAsync({ id: studentId, payload: { status, reason: reason || undefined, on_date: onDate || undefined } })
      toast({ title: 'Status updated', variant: 'success' })
      reset()
      onClose()
    } catch (err) {
      toast({ title: 'Could not change status', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset() }}
      title="Change student status"
      size="sm"
      footer={
        <Button onClick={submit} loading={changeStatus.isPending} disabled={!status}>
          Change status
        </Button>
      }
    >
      {allowed.length === 0 ? (
        <p className="text-sm text-text-muted">No status transitions are available from “{currentStatus}”.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <FormField label="New status" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value as StudentStatus)}>
              <option value="">Select…</option>
              {allowed.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Effective date" hint="Defaults to today">
            <Input type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} />
          </FormField>
          <FormField label="Reason" hint="Optional">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
      )}
    </Modal>
  )
}

function TransferDialog({
  open,
  onClose,
  studentId,
  currentCampus,
}: {
  open: boolean
  onClose: () => void
  studentId: number
  currentCampus: number
}) {
  const [campus, setCampus] = useState('')
  const [reason, setReason] = useState('')
  const [onDate, setOnDate] = useState('')
  const { data: campuses } = useCampuses({ page_size: 200 })
  const transfer = useTransferStudent()

  const reset = () => {
    setCampus('')
    setReason('')
    setOnDate('')
  }

  const submit = async () => {
    if (!campus) return
    try {
      await transfer.mutateAsync({ id: studentId, payload: { campus: Number(campus), reason: reason || undefined, on_date: onDate || undefined } })
      toast({ title: 'Student transferred', variant: 'success' })
      reset()
      onClose()
    } catch (err) {
      toast({ title: 'Could not transfer student', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset() }}
      title="Transfer to another campus"
      size="sm"
      footer={
        <Button onClick={submit} loading={transfer.isPending} disabled={!campus}>
          Transfer
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="New campus" required>
          <Select value={campus} onChange={(e) => setCampus(e.target.value)}>
            <option value="">Select a campus…</option>
            {campuses?.results.filter((c) => c.id !== currentCampus).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Effective date" hint="Defaults to today">
          <Input type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} />
        </FormField>
        <FormField label="Reason" hint="Optional">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}
