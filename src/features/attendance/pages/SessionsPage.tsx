import { useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { Label } from '@/components/ui/label'
import { useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { hhmm } from '@/features/timetable/api/timetable.api'
import { useListState } from '@/hooks/usePagination'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Session } from '../api/attendance.api'
import { useSessions } from '../hooks/useAttendance'

/** Every roll call taken or started, newest first. Missing ones are on the Today tab. */
export default function SessionsPage() {
  const navigate = useNavigate()
  const dateId = useId()
  const { selectedBranchId } = useBranches()
  const list = useListState({ filters: ['date', 'status', 'kind', 'section'], defaultOrdering: '-date' })
  const query = useSessions(list.query)
  const current = useCurrentAcademicYear()
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: current.data?.id, campus: selectedBranchId ?? undefined, ordering: 'level' })

  const columns: Column<Session>[] = [
    { id: 'date', header: 'Date', sortField: 'date', className: 'whitespace-nowrap tabular-nums', cell: (s) => formatDate(s.date) },
    {
      id: 'what',
      header: 'Class',
      mobile: 'title',
      cell: (s) => (
        <span className="font-medium">
          {s.kind === 'lesson' ? s.subject_name : 'Roll call'} <span className="font-normal text-muted-foreground">· {s.section_name}</span>
        </span>
      ),
    },
    { id: 'time', header: 'Time', className: 'tabular-nums', cell: (s) => (s.start_time ? hhmm(s.start_time) : 'Daily') },
    { id: 'teacher', header: 'Teacher', cell: (s) => s.teacher_name || <span className="text-muted-foreground">—</span> },
    { id: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} label={enumLabel('AttendanceSessionStatusEnum', s.status)} /> },
  ]

  return (
    <DataTable
      ariaLabel="Attendance sessions"
      columns={columns}
      query={query}
      list={list}
      getRowId={(s) => s.id}
      searchable={false}
      onRowClick={(s) => navigate(`/attendance/sessions/${s.id}`)}
      toolbar={
        <div className="flex items-center gap-2">
          <Label htmlFor={dateId} className="text-muted-foreground">
            Date
          </Label>
          <DatePicker id={dateId} value={list.filters.date ?? ''} onChange={(v) => list.setFilter('date', v || undefined)} />
        </div>
      }
      filters={[
        { name: 'status', label: 'Status', options: enumOptions('AttendanceSessionStatusEnum') },
        { name: 'kind', label: 'Kind', options: enumOptions('SessionKindEnum') },
        { name: 'section', label: 'Class', options: (classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.display_name })) },
      ]}
      empty={{ title: 'No attendance taken yet', description: 'Sessions appear here once a teacher or the office opens one from the Today tab.' }}
    />
  )
}
