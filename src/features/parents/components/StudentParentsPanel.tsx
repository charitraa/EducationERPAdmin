import { Link } from 'react-router-dom'
import { Spinner } from '@/components/data-display/LoadingState'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import { useStudentParents } from '../hooks/useParents'

/** Who to call about a student. Links are managed from the parent's page. */
export function StudentParentsPanel({ studentId }: { studentId: Id }) {
  const { can } = usePermissions()
  const allowed = can(PERMS.parents.view)
  const parents = useStudentParents(studentId, allowed)
  if (!allowed) return null

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Parents</h2>
      {parents.isPending ? (
        <Spinner />
      ) : parents.isError ? (
        <p className="text-sm text-danger">Couldn’t load parents.</p>
      ) : parents.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          None linked. <Link to="/parents" className="underline">Find or add a parent</Link> and link this student from their page.
        </p>
      ) : (
        <ul className="grid gap-3">
          {parents.data.map((p) => (
            <li key={p.id} className="text-sm">
              <Link to={`/parents/${p.id}`} className="font-medium hover:underline">
                {p.full_name}
              </Link>
              {p.phone && (
                <a href={`tel:${p.phone}`} className="block text-xs tabular-nums text-muted-foreground hover:underline">
                  {p.phone}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
