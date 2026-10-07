import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { pluralize } from '@/lib/formatters'
import { useCount } from '@/shared/api/count'
import { PERMS } from '@/shared/constants/permissions'
import { StepNote } from './StepParts'
import { tr } from '@/lib/i18n'

/**
 * Steps 5 and 6. The counts come from the API; people are added in the Staff,
 * Users, Admissions and Students screens, which this step links to.
 */
export function PeopleStep({ kind }: { kind: 'staff' | 'students' }) {
  const { hasPermission } = usePermissions()
  const rows =
    kind === 'staff'
      ? [
          { label: tr('Staff members'), resource: 'staff', path: '/staff/', perm: PERMS.staff.view, one: 'staff member', many: 'staff members' },
          { label: tr('People who can sign in'), resource: 'users', path: '/users/', perm: PERMS.users.view, one: 'user', many: 'users' },
        ]
      : [
          { label: tr('Students'), resource: 'students', path: '/students/', perm: PERMS.students.view, one: 'student', many: 'students' },
          { label: tr('Pending admissions'), resource: 'admissions', path: '/admissions/', perm: PERMS.admissions.view, one: 'admission', many: 'admissions', params: { status: 'pending' } },
          { label: tr('Parents'), resource: 'parents', path: '/parents/', perm: PERMS.parents.view, one: 'parent', many: 'parents' },
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
          ? tr('Add teachers and office staff one by one or import a spreadsheet, then give each a login and a role under Users. You can come back to this step any time.')
          : tr('Add students one by one or import a spreadsheet, or record admissions and enroll them; parents are linked from a student’s page. You can come back to this step any time.')}
      </StepNote>
      <div className="flex flex-wrap gap-2">
        {kind === 'staff' ? (
          <>
            {hasPermission(PERMS.staff.create) && (
              <>
                <Button asChild variant="outline">
                  <Link to="/staff/new">{tr('Add staff member')}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/staff/import">{tr('Import staff')}</Link>
                </Button>
              </>
            )}
            {hasPermission(PERMS.users.view) && (
              <Button asChild variant="outline">
                <Link to="/users">{tr('Users')}</Link>
              </Button>
            )}
          </>
        ) : (
          <>
            {hasPermission(PERMS.students.create) && (
              <>
                <Button asChild variant="outline">
                  <Link to="/students/new">{tr('Add student')}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/students/import">{tr('Import students')}</Link>
                </Button>
              </>
            )}
            {hasPermission(PERMS.admissions.view) && (
              <Button asChild variant="outline">
                <Link to="/admissions">{tr('Admissions')}</Link>
              </Button>
            )}
          </>
        )}
      </div>
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
