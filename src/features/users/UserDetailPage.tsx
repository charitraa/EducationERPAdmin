import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, KeyRound, Plus, ShieldOff, UserX, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Spinner } from '@/components/ui/Spinner'
import { PermissionGate } from '@/components/common/PermissionGate'
import { formatDate, formatDateTime, titleCase } from '@/lib/utils'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'
import type { UserType } from '@/lib/api/types'
import { useDeactivateUser, useReset2fa, useRevokeRole, useSetPassword, useUpdateUser, useUser } from './hooks'
import { AssignRoleDialog } from './AssignRoleDialog'

const schema = z.object({
  email: z.string().min(1, 'Required').email(),
  phone: z.string().optional(),
  first_name: z.string().min(1, 'Required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Required'),
  user_type: z.enum(['student', 'parent', 'teacher', 'staff', 'administrator']),
})

type FormValues = z.infer<typeof schema>

const USER_TYPES: UserType[] = ['administrator', 'staff', 'teacher', 'parent', 'student']

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const userId = Number(id)
  const navigate = useNavigate()

  const { data: user, isLoading } = useUser(userId)
  const update = useUpdateUser()
  const deactivate = useDeactivateUser()
  const reset2fa = useReset2fa()
  const revokeRole = useRevokeRole()

  const [assignOpen, setAssignOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [reset2faOpen, setReset2faOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: user
      ? {
          email: user.email,
          phone: user.phone,
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          user_type: user.user_type,
        }
      : undefined,
  })

  if (isLoading || !user) {
    return <Spinner />
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ id: userId, payload: { ...values, is_active: user.is_active } })
      toast({ title: 'User updated', variant: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', description: toApiError(err).message, variant: 'error' })
    }
  })

  const handleDeactivate = async () => {
    try {
      await deactivate.mutateAsync({
        id: userId,
        payload: {
          email: user.email,
          phone: user.phone,
          first_name: user.first_name,
          middle_name: user.middle_name,
          last_name: user.last_name,
          user_type: user.user_type,
          is_active: false,
        },
      })
      toast({ title: user.is_active ? 'User deactivated' : 'User reactivated', variant: 'success' })
      setDeactivateOpen(false)
    } catch (err) {
      toast({ title: 'Action failed', description: toApiError(err).message, variant: 'error' })
    }
  }

  const handleReset2fa = async () => {
    try {
      await reset2fa.mutateAsync(userId)
      toast({ title: 'Two-factor authentication reset', variant: 'success' })
      setReset2faOpen(false)
    } catch (err) {
      toast({ title: 'Action failed', description: toApiError(err).message, variant: 'error' })
    }
  }

  const handleRevoke = async (roleId: number, campus: number | null) => {
    try {
      await revokeRole.mutateAsync({ id: userId, payload: { role: roleId, campus } })
      toast({ title: 'Role revoked', variant: 'success' })
    } catch (err) {
      toast({ title: 'Could not revoke role', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate('/users')}
        className="mb-3 flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" /> Back to users
      </button>

      <PageHeader
        title={user.full_name}
        description={user.email}
        actions={
          <>
            <Badge tone={user.is_active ? 'success' : 'neutral'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
            <PermissionGate any={['users.update']}>
              <Button variant="outline" onClick={() => setPasswordOpen(true)}>
                <KeyRound className="size-4" /> Set password
              </Button>
              <Button variant="outline" onClick={() => setReset2faOpen(true)}>
                <ShieldOff className="size-4" /> Reset 2FA
              </Button>
              <Button variant={user.is_active ? 'danger' : 'primary'} onClick={() => setDeactivateOpen(true)}>
                <UserX className="size-4" /> {user.is_active ? 'Deactivate' : 'Reactivate'}
              </Button>
            </PermissionGate>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardBody>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First name" required error={errors.first_name?.message}>
                  <Input {...register('first_name')} />
                </FormField>
                <FormField label="Last name" required error={errors.last_name?.message}>
                  <Input {...register('last_name')} />
                </FormField>
              </div>
              <FormField label="Middle name">
                <Input {...register('middle_name')} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email" required error={errors.email?.message}>
                  <Input type="email" {...register('email')} />
                </FormField>
                <FormField label="Phone">
                  <Input {...register('phone')} />
                </FormField>
              </div>
              <FormField label="User type" required>
                <Select {...register('user_type')}>
                  {USER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {titleCase(t)}
                    </option>
                  ))}
                </Select>
              </FormField>
              <p className="text-xs text-text-faint">
                Joined {formatDate(user.date_joined)} · Last login {user.last_login ? formatDateTime(user.last_login) : 'never'}
              </p>
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
            <CardTitle>Roles</CardTitle>
            <PermissionGate any={['users.manage_roles']}>
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                <Plus className="size-4" /> Assign role
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {user.role_assignments.length === 0 && <p className="text-sm text-text-muted">No roles assigned.</p>}
            {user.role_assignments.map((ra) => (
              <div key={ra.id} className="flex items-center justify-between rounded-md border border-border-soft px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-text">{ra.role_name}</p>
                  <p className="text-xs text-text-muted">
                    {ra.campus_name ?? 'Organization-wide'}
                    {ra.expires_at ? ` · expires ${formatDate(ra.expires_at)}` : ''}
                  </p>
                </div>
                <PermissionGate any={['users.manage_roles']}>
                  <button
                    onClick={() => handleRevoke(ra.role, ra.campus)}
                    className="rounded-md p-1.5 text-text-faint hover:bg-danger-soft hover:text-danger"
                    aria-label="Revoke role"
                  >
                    <X className="size-4" />
                  </button>
                </PermissionGate>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <AssignRoleDialog open={assignOpen} onClose={() => setAssignOpen(false)} userId={userId} />
      <SetPasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} userId={userId} />
      <ConfirmDialog
        open={deactivateOpen}
        onCancel={() => setDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        loading={deactivate.isPending}
        variant={user.is_active ? 'danger' : 'primary'}
        title={user.is_active ? 'Deactivate this user?' : 'Reactivate this user?'}
        description={
          user.is_active
            ? 'They will no longer be able to sign in until reactivated.'
            : 'They will be able to sign in again.'
        }
        confirmLabel={user.is_active ? 'Deactivate' : 'Reactivate'}
      />
      <ConfirmDialog
        open={reset2faOpen}
        onCancel={() => setReset2faOpen(false)}
        onConfirm={handleReset2fa}
        loading={reset2fa.isPending}
        title="Reset two-factor authentication?"
        description="Use this if the user has lost access to their authenticator app. They'll be able to sign in with just a password until they set 2FA up again."
        confirmLabel="Reset 2FA"
        variant="danger"
      />
    </div>
  )
}

function SetPasswordDialog({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: number }) {
  const [password, setPassword] = useState('')
  const setPasswordMutation = useSetPassword()

  const submit = async () => {
    try {
      await setPasswordMutation.mutateAsync({ id: userId, new_password: password })
      toast({ title: 'Password updated', variant: 'success' })
      setPassword('')
      onClose()
    } catch (err) {
      toast({ title: 'Could not set password', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set a new password"
      size="sm"
      footer={
        <Button onClick={submit} loading={setPasswordMutation.isPending} disabled={password.length < 8}>
          Set password
        </Button>
      }
    >
      <FormField label="New password" required hint="At least 8 characters">
        <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
      </FormField>
    </Modal>
  )
}
