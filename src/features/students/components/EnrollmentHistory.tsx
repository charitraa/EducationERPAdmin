import { useBranches } from '@/app/providers/BranchProvider'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { formatDate, todayIso } from '@/lib/dates'
import type { Id } from '@/shared/types/api'
import { ENROLLMENT_STATUS_LABELS, type Enrollment } from '../api/students.api'
import { useStudentEnrollments } from '../hooks/useStudents'
import { tr } from '@/lib/i18n'

/** A move recorded ahead of time: open, but not started yet. */
export const isUpcoming = (e: Enrollment) => e.status === 'active' && e.started_on > todayIso()

/** Every class and branch the student has been in, newest first. */
export function EnrollmentHistory({ studentId }: { studentId: Id }) {
  const history = useStudentEnrollments(studentId)
  const { isMultiBranch } = useBranches()

  if (history.isPending) return <TableSkeleton rows={3} columns={4} />
  if (history.isError) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />
  if (history.data.length === 0) return <p className="p-4 text-sm text-muted-foreground">{tr('No enrollment history.')}</p>

  return (
    <ol className="divide-y">
      {history.data.map((e) => (
        <li key={e.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="min-w-0">
            <p className="font-medium">
              {e.section_name ?? <span className="text-muted-foreground">{tr('Not placed in a class')}</span>}
              {e.academic_year_name && <span className="font-normal text-muted-foreground"> · {e.academic_year_name}</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {[e.program_name, isMultiBranch ? e.campus_name : null].filter(Boolean).join(' · ')}
            </p>
            {e.end_reason && <p className="mt-1 text-sm text-muted-foreground">“{e.end_reason}”</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatDate(e.started_on)} → {e.ended_on ? formatDate(e.ended_on) : 'now'}
            </span>
            {isUpcoming(e) ? (
              <StatusBadge status="scheduled" label={tr('Starts {date}', { date: formatDate(e.started_on) })} />
            ) : (
              <StatusBadge status={e.status === 'active' ? 'current' : e.status} label={ENROLLMENT_STATUS_LABELS[e.status]} />
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
