import { usePermissions } from '@/hooks/usePermissions'
import { pluralize } from '@/lib/formatters'
import { useCount } from '@/shared/api/count'
import { PERMS } from '@/shared/constants/permissions'
import { StepNote } from './StepParts'

/**
 * Steps 5 and 6. The counts come from the API; adding people happens in the
 * Staff, Users, Admissions and Students screens, which arrive in the next
 * phase, so for now this step reports progress and can be skipped.
 */
export function PeopleStep({ kind }: { kind: 'staff' | 'students' }) {
  const { hasPermission } = usePermissions()
  const rows =
    kind === 'staff'
      ? [
          { label: 'Staff members', resource: 'staff', path: '/staff/', perm: PERMS.staff.view, one: 'staff member', many: 'staff members' },
          { label: 'People who can sign in', resource: 'users', path: '/users/', perm: PERMS.users.view, one: 'user', many: 'users' },
        ]
      : [
          { label: 'Students', resource: 'students', path: '/students/', perm: PERMS.students.view, one: 'student', many: 'students' },
          { label: 'Pending admissions', resource: 'admissions', path: '/admissions/', perm: PERMS.admissions.view, one: 'admission', many: 'admissions', params: { status: 'pending' } },
          { label: 'Parents', resource: 'parents', path: '/parents/', perm: PERMS.parents.view, one: 'parent', many: 'parents' },
        ]

  return (
    <div className="grid gap-4">
      <ul className="grid gap-2 sm:grid-cols-3">
        {rows.map((r) => (
          <CountTile key={r.resource} {...r} enabled={hasPermission(r.perm)} />
        ))}
      </ul>
      <StepNote>
        {kind === 'staff'
          ? 'The Staff and Users screens, where you add teachers and give them logins and roles, come in the next release. Skip this step for now and come back to it.'
          : 'The Admissions and Students screens come in the next release. Skip this step for now and come back to it.'}
      </StepNote>
    </div>
  )
}

function CountTile({ label, resource, path, enabled, one, many, params }: { label: string; resource: string; path: string; enabled: boolean; one: string; many: string; params?: Record<string, string> }) {
  const count = useCount(resource, path, params, enabled)
  return (
    <li className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{!enabled ? '—' : count.isPending ? '…' : count.isError ? '—' : pluralize(count.data, one, many)}</p>
    </li>
  )
}
