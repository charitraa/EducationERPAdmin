import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus, Search, Star, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { PermissionGate } from '@/components/PermissionGate'
import { studentsApi } from '@/lib/api/students'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'
import type { GuardianRelationship } from '@/lib/api/parents'
import { useLinkStudent, useParent, useParentChildren, useUnlinkStudent, useUpdateParent } from './hooks'

const RELATIONSHIPS: GuardianRelationship[] = ['father', 'mother', 'guardian', 'other']

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

export function ParentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const parentId = Number(id)
  const navigate = useNavigate()

  const { data: parent, isLoading } = useParent(parentId)
  const { data: children } = useParentChildren(parentId)
  const update = useUpdateParent()
  const unlink = useUnlinkStudent()
  const [linkOpen, setLinkOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: parent
      ? {
          first_name: parent.first_name,
          middle_name: parent.middle_name,
          last_name: parent.last_name,
          phone: parent.phone,
          email: parent.email,
          occupation: parent.occupation,
          address: parent.address,
        }
      : undefined,
  })

  if (isLoading || !parent) return <Spinner />

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        id: parentId,
        payload: { ...values, email: values.email ?? '', occupation: values.occupation ?? '', user: parent.user },
      })
      toast({ title: 'Parent updated', variant: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', description: toApiError(err).message, variant: 'error' })
    }
  })

  const handleUnlink = async (student: number) => {
    try {
      await unlink.mutateAsync({ id: parentId, student })
      toast({ title: 'Student unlinked', variant: 'success' })
    } catch (err) {
      toast({ title: 'Could not unlink student', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <div>
      <button onClick={() => navigate('/parents')} className="mb-3 flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Back to parents
      </button>

      <PageHeader title={parent.full_name} description={parent.email || parent.phone || undefined} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Parent details</CardTitle>
          </CardHeader>
          <CardBody>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
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
            <CardTitle>Linked children</CardTitle>
            <PermissionGate any={['parents.update']}>
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
                <Plus className="size-4" /> Link student
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {!children || children.results.length === 0 ? (
              <EmptyState title="No children linked yet" />
            ) : (
              children.results.map((c) => (
                <div key={c.student} className="flex items-center justify-between rounded border border-border-soft px-3 py-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-text">
                      {c.full_name}
                      {c.is_primary_contact && <Star className="size-3.5 fill-warning text-warning" />}
                    </p>
                    <p className="text-xs text-text-muted">
                      {c.student_number} · {c.campus_name} · <span className="capitalize">{c.relationship}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <PermissionGate any={['parents.update']}>
                      <button
                        onClick={() => handleUnlink(c.student)}
                        className="rounded p-1.5 text-text-faint hover:bg-danger-soft hover:text-danger"
                        aria-label="Unlink student"
                      >
                        <X className="size-4" />
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <LinkStudentDialog open={linkOpen} onClose={() => setLinkOpen(false)} parentId={parentId} />
    </div>
  )
}

function LinkStudentDialog({ open, onClose, parentId }: { open: boolean; onClose: () => void; parentId: number }) {
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState<number | null>(null)
  const [relationship, setRelationship] = useState<GuardianRelationship>('guardian')
  const [isPrimary, setIsPrimary] = useState(false)
  const linkStudent = useLinkStudent()

  const { data: results, isFetching } = useQuery({
    queryKey: ['students', 'search', search],
    queryFn: () => studentsApi.list({ search, page_size: 10 }),
    enabled: search.length >= 2,
  })

  const reset = () => {
    setSearch('')
    setStudentId(null)
    setRelationship('guardian')
    setIsPrimary(false)
  }

  const submit = async () => {
    if (!studentId) return
    try {
      await linkStudent.mutateAsync({ id: parentId, payload: { student: studentId, relationship, is_primary_contact: isPrimary } })
      toast({ title: 'Student linked', variant: 'success' })
      reset()
      onClose()
    } catch (err) {
      toast({ title: 'Could not link student', description: toApiError(err).message, variant: 'error' })
    }
  }

  const selected = results?.results.find((s) => s.id === studentId)

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset() }}
      title="Link a student"
      size="sm"
      footer={
        <Button onClick={submit} loading={linkStudent.isPending} disabled={!studentId}>
          Link student
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Student" required hint={selected ? undefined : 'Search by name or student number'}>
          {selected ? (
            <div className="flex items-center justify-between rounded border border-border-soft px-3 py-2">
              <span className="text-sm text-text">{selected.full_name} · {selected.student_number}</span>
              <button type="button" onClick={() => setStudentId(null)} className="text-text-faint hover:text-text">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
              <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search…" />
            </div>
          )}
        </FormField>
        {!selected && search.length >= 2 && (
          <div className="max-h-48 overflow-y-auto rounded border border-border-soft">
            {isFetching && <p className="p-3 text-sm text-text-muted">Searching…</p>}
            {!isFetching && results?.results.length === 0 && <p className="p-3 text-sm text-text-muted">No students found.</p>}
            {results?.results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStudentId(s.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span>{s.full_name}</span>
                <span className="text-text-faint">{s.student_number}</span>
              </button>
            ))}
          </div>
        )}
        <FormField label="Relationship" required>
          <Select value={relationship} onChange={(e) => setRelationship(e.target.value as GuardianRelationship)}>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r} className="capitalize">{r}</option>
            ))}
          </Select>
        </FormField>
        <label className="flex items-center gap-2 text-sm text-text">
          <Checkbox checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} /> Primary contact
        </label>
      </div>
    </Modal>
  )
}
