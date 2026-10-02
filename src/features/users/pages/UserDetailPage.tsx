import { KeyRound, Pencil, Plus, Power, ShieldOff, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { RoleAssignment } from '../api/users.api'
import { AssignRoleDialog } from '../components/AssignRoleDialog'
import { SetPasswordDialog } from '../components/SetPasswordDialog'
import { UserFormDialog } from '../components/UserFormDialog'
import { useDeactivateUser, useReactivateUser, useRemoveUser, useResetTwoFactor, useRevokeRole, useUser } from '../hooks/useUsers'

type Dialog = 'edit' | 'password' | 'assign' | 'deactivate' | 'reactivate' | 'reset2fa' | 'delete' | null

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

export default function UserDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const user = useUser(id)
  const { user: me } = useAuth()
  const { can } = usePermissions()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [revoking, setRevoking] = useState<RoleAssignment | null>(null)
  const deactivate = useDeactivateUser()
  const reactivate = useReactivateUser()
  const resetTwoFactor = useResetTwoFactor()
  const revoke = useRevokeRole()
  const remove = useRemoveUser()

  if (user.isPending) return <PageLoader />
  if (user.isError) return <ErrorState error={user.error} onRetry={() => void user.refetch()} />
  const u = user.data
  const isMe = me?.id === u.id
  const active = u.is_active !== false
  const name = u.full_name || u.email
  const close = (o: boolean) => !o && setDialog(null)

  return (
    <>
      <PageHeader
        backTo="/users"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {name}
            <StatusBadge status={active ? 'active' : 'inactive'} label={active ? 'Active' : 'Deactivated'} />
            {isMe && <span className="text-sm font-normal text-muted-foreground">(you)</span>}
          </span>
        }
        description={`${u.email} · ${enumLabel('UserTypeEnum', u.user_type)}`}
        actions={
          <>
            <PermissionGate permission={PERMS.users.update}>
              <Button variant="outline" size="sm" onClick={() => setDialog('edit')}>
                <Pencil aria-hidden /> Edit
              </Button>
            </PermissionGate>
            <RowActions
              label="More actions"
              actions={[
                { label: 'Set password', icon: KeyRound, permission: PERMS.users.update, onSelect: () => setDialog('password') },
                { label: 'Turn off two-factor', icon: ShieldOff, permission: PERMS.users.update, onSelect: () => setDialog('reset2fa') },
                { label: 'Reactivate', icon: Power, permission: PERMS.users.update, hidden: active, onSelect: () => setDialog('reactivate') },
                { label: 'Deactivate', icon: Power, permission: PERMS.users.update, hidden: !active || isMe, destructive: true, onSelect: () => setDialog('deactivate') },
                { label: 'Delete', icon: Trash2, permission: PERMS.users.delete, hidden: isMe, destructive: true, onSelect: () => setDialog('delete') },
              ]}
            />
          </>
        }
      />

      {!active && (
        <div className="mb-5 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm">This account is deactivated: it can’t sign in. Its history is kept.</div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Roles</h2>
              <p className="text-xs text-muted-foreground">Everything this person can do comes from these.</p>
            </div>
            <PermissionGate permission={PERMS.users.manageRoles}>
              <Button size="sm" variant="outline" onClick={() => setDialog('assign')}>
                <Plus aria-hidden /> Add role
              </Button>
            </PermissionGate>
          </div>
          {u.role_assignments.length === 0 ? (
            <p className="p-4 text-sm text-warning">No roles yet: they can sign in but can’t see or do anything.</p>
          ) : (
            <ul className="divide-y">
              {u.role_assignments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.role_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.campus_name ? `Only at ${a.campus_name}` : 'Whole organization'}
                      {a.expires_at ? ` · until ${formatDateTime(a.expires_at)}` : ''}
                    </p>
                  </div>
                  {can(PERMS.users.manageRoles) && !(isMe && u.role_assignments.length === 1) && (
                    <Button variant="ghost" size="sm" onClick={() => setRevoking(a)} aria-label={`Remove role ${a.role_name}`}>
                      <X aria-hidden /> Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold">Account</h2>
          <dl className="grid gap-4">
            <Field label="Phone">{u.phone}</Field>
            <Field label="Joined">{formatDateTime(u.date_joined)}</Field>
            <Field label="Last sign-in">{u.last_login ? formatDateTime(u.last_login) : 'Never'}</Field>
          </dl>
        </section>
      </div>

      <UserFormDialog open={dialog === 'edit'} onOpenChange={close} record={u} />
      <SetPasswordDialog user={u} open={dialog === 'password'} onOpenChange={close} />
      <AssignRoleDialog user={u} open={dialog === 'assign'} onOpenChange={close} />
      <ConfirmDialog
        open={dialog === 'deactivate'}
        onOpenChange={close}
        tone="destructive"
        title={`Deactivate ${name}?`}
        description="They’re signed out and can’t sign in again until reactivated. Their records and history stay."
        confirmLabel="Deactivate"
        onConfirm={async () => {
          await deactivate.mutateAsync(u.id)
          toast.success('Account deactivated.')
        }}
      />
      <ConfirmDialog
        open={dialog === 'reactivate'}
        onOpenChange={close}
        title={`Reactivate ${name}?`}
        description="They can sign in again with their existing password and roles."
        confirmLabel="Reactivate"
        onConfirm={async () => {
          await reactivate.mutateAsync(u.id)
          toast.success('Account reactivated.')
        }}
      />
      <ConfirmDialog
        open={dialog === 'reset2fa'}
        onOpenChange={close}
        title="Turn off two-factor sign-in?"
        description="Use this when they’ve lost their phone. They sign in with just their password until they set it up again."
        confirmLabel="Turn off"
        onConfirm={async () => {
          await resetTwoFactor.mutateAsync(u.id)
          toast.success('Two-factor sign-in turned off.')
        }}
      />
      <DeleteDialog
        open={dialog === 'delete'}
        onOpenChange={close}
        subject={`the account ${u.email}`}
        description="Deactivating is usually better: it keeps who did what in the audit log readable."
        onConfirm={async () => {
          await remove.mutateAsync(u.id)
          toast.success('Account deleted.')
          navigate('/users', { replace: true })
        }}
      />
      {revoking && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setRevoking(null)}
          tone="destructive"
          title={`Remove ${revoking.role_name}?`}
          description={`${name} loses every permission that comes only from this role${revoking.campus_name ? ` at ${revoking.campus_name}` : ''}.`}
          confirmLabel="Remove role"
          onConfirm={async () => {
            await revoke.mutateAsync({ id: u.id, role: revoking.role, campus: revoking.campus ?? null })
            toast.success('Role removed.')
          }}
        />
      )}
    </>
  )
}
