import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Check, GraduationCap, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { PermissionGate } from '@/components/PermissionGate'
import { useCampuses } from '@/features/campuses/hooks'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'
import { ADMISSION_ACTIONS } from '@/lib/api/admissions'
import type { Gender } from '@/lib/api/students'
import { useAdmission, useApproveAdmission, useEnrollAdmission, useRejectAdmission, useUpdateAdmission, useWithdrawAdmission } from './hooks'

const GENDERS: Gender[] = ['male', 'female', 'other', 'undisclosed']
const RELATIONSHIPS = ['father', 'mother', 'guardian', 'other'] as const

const schema = z.object({
  application_number: z.string().min(1, 'Required'),
  applied_on: z.string().optional(),
  applying_for: z.string().min(1, 'Required'),
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

export function AdmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const admissionId = Number(id)
  const navigate = useNavigate()

  const { data: admission, isLoading } = useAdmission(admissionId)
  const { data: campuses } = useCampuses({ page_size: 200 })
  const update = useUpdateAdmission()

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: admission
      ? {
          application_number: admission.application_number,
          applied_on: admission.applied_on ?? '',
          applying_for: admission.applying_for,
          first_name: admission.first_name,
          middle_name: admission.middle_name,
          last_name: admission.last_name,
          date_of_birth: admission.date_of_birth ?? '',
          gender: admission.gender,
          email: admission.email,
          phone: admission.phone,
          address: admission.address,
          previous_school: admission.previous_school,
          guardian_first_name: admission.guardian_first_name,
          guardian_last_name: admission.guardian_last_name,
          guardian_relationship: admission.guardian_relationship,
          guardian_phone: admission.guardian_phone,
          guardian_email: admission.guardian_email,
        }
      : undefined,
  })

  if (isLoading || !admission) return <Spinner />

  const actions = ADMISSION_ACTIONS[admission.status]
  const editable = admission.status === 'pending'
  const campusName = campuses?.results.find((c) => c.id === admission.campus)?.name ?? admission.campus_name

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: admissionId,
        payload: {
          ...values,
          email: values.email ?? '',
          guardian_email: values.guardian_email ?? '',
          previous_school: values.previous_school ?? '',
          date_of_birth: values.date_of_birth || null,
          applied_on: values.applied_on || null,
          campus: admission.campus,
        },
      })
      toast({ title: 'Application updated', variant: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <div>
      <button onClick={() => navigate('/admissions')} className="mb-3 flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Back to admissions
      </button>

      <PageHeader
        title={admission.full_name}
        description={`${admission.application_number} · ${campusName}`}
        actions={
          <>
            <StatusBadge status={admission.status} />
            <PermissionGate any={['admissions.update']}>
              {actions.includes('approve') && (
                <Button variant="outline" onClick={() => setApproveOpen(true)}>
                  <Check className="size-4" /> Approve
                </Button>
              )}
              {actions.includes('reject') && (
                <Button variant="outline" onClick={() => setRejectOpen(true)}>
                  <X className="size-4" /> Reject
                </Button>
              )}
              {actions.includes('withdraw') && (
                <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
                  Withdraw
                </Button>
              )}
              {actions.includes('enroll') && (
                <Button onClick={() => setEnrollOpen(true)}>
                  <GraduationCap className="size-4" /> Enroll
                </Button>
              )}
            </PermissionGate>
          </>
        }
      />

      {admission.decided_at && (
        <Card className="mb-6">
          <CardBody className="flex flex-col gap-1">
            <p className="text-sm text-text">
              Decided {formatDateTime(admission.decided_at)}
            </p>
            {admission.decision_note && <p className="text-sm text-text-muted">“{admission.decision_note}”</p>}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Applicant</CardTitle>
          </CardHeader>
          <CardBody>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Application #" required error={errors.application_number?.message}>
                  <Input disabled={!editable} {...register('application_number')} />
                </FormField>
                <FormField label="Applying for" required error={errors.applying_for?.message}>
                  <Input disabled={!editable} {...register('applying_for')} />
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="First name" required error={errors.first_name?.message}>
                  <Input disabled={!editable} {...register('first_name')} />
                </FormField>
                <FormField label="Middle name">
                  <Input disabled={!editable} {...register('middle_name')} />
                </FormField>
                <FormField label="Last name" required error={errors.last_name?.message}>
                  <Input disabled={!editable} {...register('last_name')} />
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Date of birth">
                  <Input type="date" disabled={!editable} {...register('date_of_birth')} />
                </FormField>
                <FormField label="Gender" required>
                  <Select disabled={!editable} {...register('gender')}>
                    {GENDERS.map((g) => (
                      <option key={g} value={g} className="capitalize">{g}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Applied on">
                  <Input type="date" disabled={!editable} {...register('applied_on')} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email" error={errors.email?.message}>
                  <Input type="email" disabled={!editable} {...register('email')} />
                </FormField>
                <FormField label="Phone">
                  <Input disabled={!editable} {...register('phone')} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Address">
                  <Input disabled={!editable} {...register('address')} />
                </FormField>
                <FormField label="Previous school">
                  <Input disabled={!editable} {...register('previous_school')} />
                </FormField>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">Guardian</p>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="First name" required error={errors.guardian_first_name?.message}>
                  <Input disabled={!editable} {...register('guardian_first_name')} />
                </FormField>
                <FormField label="Last name" required error={errors.guardian_last_name?.message}>
                  <Input disabled={!editable} {...register('guardian_last_name')} />
                </FormField>
                <FormField label="Relationship" required>
                  <Select disabled={!editable} {...register('guardian_relationship')}>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r} className="capitalize">{r}</option>
                    ))}
                  </Select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Phone">
                  <Input disabled={!editable} {...register('guardian_phone')} />
                </FormField>
                <FormField label="Email" error={errors.guardian_email?.message}>
                  <Input type="email" disabled={!editable} {...register('guardian_email')} />
                </FormField>
              </div>

              {editable && (
                <div>
                  <Button type="submit" loading={update.isPending}>
                    Save changes
                  </Button>
                </div>
              )}
              {!editable && (
                <p className="text-xs text-text-faint">
                  This application was decided on {formatDate(admission.decided_at)} and can no longer be edited.
                </p>
              )}
            </form>
          </CardBody>
        </Card>
      </div>

      <ApproveDialog open={approveOpen} onClose={() => setApproveOpen(false)} admissionId={admissionId} />
      <RejectDialog open={rejectOpen} onClose={() => setRejectOpen(false)} admissionId={admissionId} />
      <WithdrawDialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)} admissionId={admissionId} />
      <EnrollDialog open={enrollOpen} onClose={() => setEnrollOpen(false)} admissionId={admissionId} />
    </div>
  )
}

function ApproveDialog({ open, onClose, admissionId }: { open: boolean; onClose: () => void; admissionId: number }) {
  const [note, setNote] = useState('')
  const approve = useApproveAdmission()

  const submit = async () => {
    try {
      await approve.mutateAsync({ id: admissionId, args: note || undefined })
      toast({ title: 'Application approved', variant: 'success' })
      setNote('')
      onClose()
    } catch (err) {
      toast({ title: 'Could not approve', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve application"
      size="sm"
      footer={
        <Button onClick={submit} loading={approve.isPending}>
          Approve
        </Button>
      }
    >
      <FormField label="Note" hint="Optional">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </Modal>
  )
}

function RejectDialog({ open, onClose, admissionId }: { open: boolean; onClose: () => void; admissionId: number }) {
  const [note, setNote] = useState('')
  const reject = useRejectAdmission()

  const submit = async () => {
    try {
      await reject.mutateAsync({ id: admissionId, args: note })
      toast({ title: 'Application rejected', variant: 'success' })
      setNote('')
      onClose()
    } catch (err) {
      toast({ title: 'Could not reject', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject application"
      size="sm"
      footer={
        <Button variant="danger" onClick={submit} loading={reject.isPending} disabled={!note}>
          Reject
        </Button>
      }
    >
      <FormField label="Note" required hint="A reason is required">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </Modal>
  )
}

function WithdrawDialog({ open, onClose, admissionId }: { open: boolean; onClose: () => void; admissionId: number }) {
  const [note, setNote] = useState('')
  const withdraw = useWithdrawAdmission()

  const submit = async () => {
    try {
      await withdraw.mutateAsync({ id: admissionId, args: note || undefined })
      toast({ title: 'Application withdrawn', variant: 'success' })
      setNote('')
      onClose()
    } catch (err) {
      toast({ title: 'Could not withdraw', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Withdraw application"
      size="sm"
      footer={
        <Button variant="danger" onClick={submit} loading={withdraw.isPending}>
          Withdraw
        </Button>
      }
    >
      <FormField label="Note" hint="Optional">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </Modal>
  )
}

function EnrollDialog({ open, onClose, admissionId }: { open: boolean; onClose: () => void; admissionId: number }) {
  const [studentNumber, setStudentNumber] = useState('')
  const [startedOn, setStartedOn] = useState('')
  const enroll = useEnrollAdmission()

  const submit = async () => {
    if (!studentNumber) return
    try {
      await enroll.mutateAsync({ id: admissionId, args: { student_number: studentNumber, started_on: startedOn || undefined } })
      toast({ title: 'Applicant enrolled', variant: 'success' })
      setStudentNumber('')
      setStartedOn('')
      onClose()
    } catch (err) {
      toast({ title: 'Could not enroll', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enroll applicant"
      description="Creates a new student record and their first enrollment."
      size="sm"
      footer={
        <Button onClick={submit} loading={enroll.isPending} disabled={!studentNumber}>
          Enroll
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Student number" required>
          <Input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
        </FormField>
        <FormField label="Start date" hint="Defaults to today">
          <Input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}
