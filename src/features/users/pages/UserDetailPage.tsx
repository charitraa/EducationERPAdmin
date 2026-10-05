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
import { tr } from '@/lib/i18n'

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
            <StatusBadge status={active ? 'active' : 'inactive'} label={active ? tr('Active') : tr('Deactivated')} />
            {isMe && <span className="text-sm font-normal text-muted-foreground">{tr('(you)')}</span>}
          </span>
        }
        description={`${u.email} · ${enumLabel('UserTypeEnum', u.user_type)}`}
        actions={
          <>
            <PermissionGate permission={PERMS.users.update}>
              <Button variant="outline" size="sm" onClick={() => setDialog('edit')}>
                <Pencil aria-hidden /> {tr('Edit')}
              </Button>
            </PermissionGate>
            <RowActions
              label={tr('More actions')}
              actions={[
                { label: tr('Set password'), icon: KeyRound, permission: PERMS.users.update, onSelect: () => setDialog('password') },
                { label: tr('Turn off two-factor'), icon: ShieldOff, permission: PERMS.users.update, onSelect: () => setDialog('reset2fa') },
                { label: tr('Reactivate'), icon: Power, permission: PERMS.users.update, hidden: active, onSelect: () => setDialog('reactivate') },
                { label: tr('Deactivate'), icon: Power, permission: PERMS.users.update, hidden: !active || isMe, destructive: true, onSelect: () => setDialog('deactivate') },
                { label: tr('Delete'), icon: Trash2, permission: PERMS.users.delete, hidden: isMe, destructive: true, onSelect: () => setDialog('delete') },
              ]}
            />
          </>
        }
      />

      {!active && (
        <div className="mb-5 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm">{tr('This account is deactivated: it can’t sign in. Its history is kept.')}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">{tr('Roles')}</h2>
              <p className="text-xs text-muted-foreground">{tr('Everything this person can do comes from these.')}</p>
            </div>
            <PermissionGate permission={PERMS.users.manageRoles}>
              <Button size="sm" variant="outline" onClick={() => setDialog('assign')}>
                <Plus aria-hidden /> {tr('Add role')}
              </Button>
            </PermissionGate>
          </div>
          {u.role_assignments.length === 0 ? (
            <p className="p-4 text-sm text-warning">{tr('No roles yet: they can sign in but can’t see or do anything.')}</p>
          ) : (
            <ul className="divide-y">
              {u.role_assignments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{tr(a.role_name)}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.campus_name ? tr('Only at {campus_name}', { campus_name: a.campus_name }) : tr('Whole organization')}
                      {a.expires_at ? ' · ' + tr('until {dateTime}', { dateTime: formatDateTime(a.expires_at) }) : ''}
                    </p>
                  </div>
                  {can(PERMS.users.manageRoles) && !(isMe && u.role_assignments.length === 1) && (
                    <Button variant="ghost" size="sm" onClick={() => setRevoking(a)} aria-label={tr('Remove role {role_name}', { role_name: a.role_name })}>
                      <X aria-hidden /> {tr('Remove')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold">{tr('Account')}</h2>
          <dl className="grid gap-4">
            <Field label={tr('Phone')}>{u.phone}</Field>
            <Field label={tr('Joined')}>{formatDateTime(u.date_joined)}</Field>
            <Field label={tr('Last sign-in')}>{u.last_login ? formatDateTime(u.last_login) : tr('Never')}</Field>
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
        title={tr('Deactivate {name}?', { name })}
        description={tr('They’re signed out and can’t sign in again until reactivated. Their records and history stay.')}
        confirmLabel={tr('Deactivate')}
        onConfirm={async () => {
          await deactivate.mutateAsync(u.id)
          toast.success(tr('Account deactivated.'))
        }}
      />
      <ConfirmDialog
        open={dialog === 'reactivate'}
        onOpenChange={close}
        title={tr('Reactivate {name}?', { name })}
        description={tr('They can sign in again with their existing password and roles.')}
        confirmLabel={tr('Reactivate')}
        onConfirm={async () => {
          await reactivate.mutateAsync(u.id)
          toast.success(tr('Account reactivated.'))
        }}
      />
      <ConfirmDialog
        open={dialog === 'reset2fa'}
        onOpenChange={close}
        title={tr('Turn off two-factor sign-in?')}
        description={tr('Use this when they’ve lost their phone. They sign in with just their password until they set it up again.')}
        confirmLabel={tr('Turn off')}
        onConfirm={async () => {
          await resetTwoFactor.mutateAsync(u.id)
          toast.success(tr('Two-factor sign-in turned off.'))
        }}
      />
      <DeleteDialog
        open={dialog === 'delete'}
        onOpenChange={close}
        subject={tr('the account {email}', { email: u.email })}
        description={tr('Deactivating is usually better: it keeps who did what in the audit log readable.')}
        onConfirm={async () => {
          await remove.mutateAsync(u.id)
          toast.success(tr('Account deleted.'))
          navigate('/users', { replace: true })
        }}
      />
      {revoking && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setRevoking(null)}
          tone="destructive"
          title={tr('Remove {role_name}?', { role_name: revoking.role_name })}
          description={tr('{name} loses every permission that comes only from this role{value}.', { name, value: revoking.campus_name ? ' ' + tr('at {campus_name}', { campus_name: revoking.campus_name }) : '' })}
          confirmLabel={tr('Remove role')}
          onConfirm={async () => {
            await revoke.mutateAsync({ id: u.id, role: revoking.role, campus: revoking.campus ?? null })
            toast.success(tr('Role removed.'))
          }}
        />
      )}
    </>
  )
}
