import { Link } from 'react-router-dom'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { formatDate } from '@/lib/dates'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import { useAssignments } from '../hooks/useInventory'

/** Staff → Assets: what a staff member holds now (laptop, keys, projector…), for the staff profile. */
export function StaffAssets({ staffId }: { staffId: Id }) {
  const query = useAssignments({ ...PICKER_PARAMS, staff: staffId })
  const current = (query.data?.results ?? []).filter((a) => a.returned_on == null)
  return (
    <section className="rounded-lg border bg-card p-4 sm:p-6">
      <h2 className="mb-3 text-sm font-semibold">Assets held</h2>
      {query.isPending ? (
        <TableSkeleton rows={2} columns={2} />
      ) : current.length === 0 ? (
        <p className="text-sm text-muted-foreground">None.</p>
      ) : (
        <ul className="divide-y text-sm">
          {current.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-1.5">
              <Link to={`/inventory/assets/${a.asset}`} className="min-w-0 hover:underline">
                {a.asset_name} <span className="font-mono text-xs text-muted-foreground">{a.asset_tag}</span>
              </Link>
              <span className="tabular-nums text-muted-foreground">since {formatDate(a.assigned_on)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
