import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { BsDateDisplay } from '@/components/forms/BsDateDisplay'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import { SectionHeader } from '../../components/SectionHeader'
import { useProgramOptions } from '../../programs/hooks/usePrograms'
import { WEEKDAYS, type CalendarEvent } from '../api/calendar.api'
import { CalendarEventFormDialog } from '../components/CalendarEventFormDialog'
import { useCalendarEvents, useRemoveCalendarEvent } from '../hooks/useCalendar'
import { tr } from '@/lib/i18n'

const KIND_TONE: Record<string, StatusTone> = { holiday: 'success', closure: 'danger', exam: 'warning', event: 'info', makeup_day: 'neutral' }

export default function CalendarPage() {
  const { isMultiBranch, branches } = useBranches()
  const programs = useProgramOptions()
  const list = useListState({ filters: ['kind', 'campus', 'program'], defaultOrdering: 'start_date' })
  const query = useCalendarEvents(list.query)
  const crud = useCrudState<CalendarEvent>()
  const remove = useRemoveCalendarEvent()

  const columns: Column<CalendarEvent>[] = [
    { id: 'title', header: tr('Title'), mobile: 'title', cell: (e) => <span className="font-medium">{e.title}</span> },
    { id: 'kind', header: tr('Kind'), cell: (e) => <StatusBadge status={e.kind} label={enumLabel('CalendarEventKindEnum', e.kind)} tone={KIND_TONE[e.kind]} /> },
    { id: 'from', header: tr('From'), sortField: 'start_date', cell: (e) => <BsDateDisplay value={e.start_date} /> },
    { id: 'to', header: tr('To'), cell: (e) => (e.end_date === e.start_date ? <span className="text-muted-foreground">{tr('Same day')}</span> : <BsDateDisplay value={e.end_date} />) },
    {
      id: 'who',
      header: tr('Applies to'),
      cell: (e) =>
        [isMultiBranch ? e.campus_name || tr('Every branch') : null, e.program_name ? `${e.program_name}${e.level != null ? ` · level ${e.level}` : ''}` : tr('Everyone')]
          .filter(Boolean)
          .join(' · '),
    },
    {
      id: 'classes',
      header: tr('Classes'),
      cell: (e) =>
        e.kind === 'makeup_day' && e.runs_timetable_of
          ? tr("{value}'s timetable", { value: WEEKDAYS[e.runs_timetable_of - 1] })
          : e.suspends_classes
            ? tr('No classes')
            : tr('As normal'),
    },
  ]

  return (
    <>
      <SectionHeader
        title={tr('Calendar')}
        description={tr('Holidays, closures, exam days and school events for the year.')}
        action={
          <PermissionGate permission={PERMS.academics.calendar}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add to calendar')}
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel={tr('School calendar')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(e) => e.id}
        searchPlaceholder={tr('Search titles…')}
        filters={[
          { name: 'kind', label: tr('Kind'), options: enumOptions('CalendarEventKindEnum') },
          { name: 'program', label: tr('Program'), options: (programs.data ?? []).map((p) => ({ value: String(p.id), label: p.name })) },
          { name: 'campus', label: tr('Branch'), hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        rowActions={(e) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, permission: PERMS.academics.calendar, onSelect: () => crud.openEdit(e) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.academics.calendar, destructive: true, onSelect: () => crud.openDelete(e) },
            ]}
          />
        )}
        empty={{
          title: tr('The calendar is empty'),
          description: tr('Add holidays and exam days so the timetable and roll calls skip them.'),
          action: (
            <PermissionGate permission={PERMS.academics.calendar}>
              <Button onClick={crud.openCreate}>
                <Plus aria-hidden /> {tr('Add the first holiday')}
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <CalendarEventFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`"${crud.deleting.title}"`}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Removed from the calendar.'))
          }}
        />
      )}
    </>
  )
}
