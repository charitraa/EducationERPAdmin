import { Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, todayIso } from '@/lib/dates'
import { PERMS } from '@/shared/constants/permissions'
import { hhmm, type LessonChange } from '../api/timetable.api'
import { useLessonChanges, useRemoveLessonChange } from '../hooks/useTimetable'

const describe = (c: LessonChange) =>
  c.is_cancelled
    ? 'Cancelled'
    : [c.substitute_teacher_name ? `Covered by ${c.substitute_teacher_name}` : null, c.room_name ? `In ${c.room_name}` : null].filter(Boolean).join(' · ')

/** Every one-day change, upcoming first. Make new ones from the Day view. */
export default function LessonChangesPage() {
  const list = useListState({ filters: ['date_from', 'date_to', 'is_cancelled'] })
  const query = useLessonChanges({ ...list.query, date_from: list.filters.date_from ?? todayIso() })
  const crud = useCrudState<LessonChange>()
  const remove = useRemoveLessonChange()

  const columns: Column<LessonChange>[] = [
    {
      id: 'date',
      header: 'Date',
      mobile: 'title',
      className: 'tabular-nums whitespace-nowrap',
      cell: (c) => (
        <Link to={`/timetable/day?date=${c.date}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
          {formatDate(c.date)}
        </Link>
      ),
    },
    { id: 'period', header: 'When', className: 'tabular-nums', cell: (c) => `${c.period_name} · ${hhmm(c.start_time)}` },
    { id: 'lesson', header: 'Lesson', cell: (c) => `${c.subject_name} · ${c.section_name}` },
    { id: 'teacher', header: 'Usual teacher', mobile: 'hidden', cell: (c) => c.regular_teacher_name },
    { id: 'change', header: 'Change', cell: (c) => (c.is_cancelled ? <StatusBadge status="cancelled" label="Cancelled" /> : describe(c)) },
    { id: 'note', header: 'Note', mobile: 'hidden', cell: (c) => c.note || <span className="text-muted-foreground">—</span> },
  ]

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        Substitutions, room moves and cancellations from today on. To make one, open the <Link to="/timetable/day" className="underline">Day</Link> view and click Change on the lesson.
      </p>
      <DataTable
        ariaLabel="Lesson changes"
        columns={columns}
        query={query}
        list={list}
        getRowId={(c) => c.id}
        searchable={false}
        filters={[{ name: 'is_cancelled', label: 'Kind', options: [{ value: 'true', label: 'Cancellations' }, { value: 'false', label: 'Cover and room moves' }] }]}
        rowActions={(c) => <RowActions actions={[{ label: 'Undo change', icon: Trash2, permission: PERMS.timetable.manage, destructive: true, onSelect: () => crud.openDelete(c) }]} />}
        empty={{ title: 'No changes coming up', description: 'Every lesson runs as timetabled.' }}
      />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject="this change"
          confirmLabel="Undo change"
          description={`${crud.deleting.subject_name} for ${crud.deleting.section_name} runs as usual on ${formatDate(crud.deleting.date)}.`}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Change undone.')
          }}
        />
      )}
    </>
  )
}
