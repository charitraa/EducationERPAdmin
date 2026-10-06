import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import { SectionHeader } from '../../components/SectionHeader'
import type { Room } from '../api/rooms.api'
import { RoomFormDialog } from '../components/RoomFormDialog'
import { useRemoveRoom, useRooms } from '../hooks/useRooms'
import { tr } from '@/lib/i18n'

export default function RoomsPage() {
  const { isMultiBranch, branches } = useBranches()
  const list = useListState({ filters: ['campus', 'room_type', 'is_active'], followBranch: true, defaultOrdering: 'code' })
  // The header's branch choice applies unless the user picked one here.
  const query = useRooms(list.query)
  const crud = useCrudState<Room>()
  const remove = useRemoveRoom()

  const columns: Column<Room>[] = [
    { id: 'code', header: tr('Code'), sortField: 'code', className: 'w-28 font-mono text-xs', mobile: 'hidden', cell: (r) => r.code },
    { id: 'name', header: tr('Room'), sortField: 'name', mobile: 'title', cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'type', header: tr('Type'), cell: (r) => enumLabel('RoomTypeEnum', r.room_type) },
    { id: 'where', header: tr('Location'), cell: (r) => [r.building, r.floor && tr('Floor {floor}', { floor: r.floor })].filter(Boolean).join(' · ') || '—' },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (r) => r.campus_name },
    { id: 'capacity', header: tr('Seats'), sortField: 'capacity', className: 'tabular-nums', cell: (r) => r.capacity ?? '—' },
    { id: 'status', header: tr('Status'), cell: (r) => <StatusBadge status={r.is_active === false ? 'inactive' : 'active'} label={r.is_active === false ? tr('Not in use') : tr('In use')} /> },
  ]

  return (
    <>
      <SectionHeader
        title={tr('Rooms')}
        description={tr('Classrooms, labs and halls, for home rooms and the timetable.')}
        action={
          <PermissionGate permission={PERMS.academics.classes}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add room')}
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel={tr('Rooms')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder={tr('Search code, name, building…')}
        filters={[
          { name: 'campus', label: tr('Branch'), hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
          { name: 'room_type', label: tr('Type'), options: enumOptions('RoomTypeEnum') },
          { name: 'is_active', label: tr('Status'), options: [{ value: 'true', label: tr('In use') }, { value: 'false', label: tr('Not in use') }] },
        ]}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, permission: PERMS.academics.classes, onSelect: () => crud.openEdit(r) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.academics.classes, destructive: true, onSelect: () => crud.openDelete(r) },
            ]}
          />
        )}
        empty={{
          title: tr('No rooms yet'),
          description: tr('Add rooms when you want home rooms for classes or a room-aware timetable.'),
          action: (
            <PermissionGate permission={PERMS.academics.classes}>
              <Button variant="outline" onClick={crud.openCreate}>
                {tr('Add a room')}
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <RoomFormDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={tr('room {code}', { code: crud.deleting.code })}
          description={tr("Rooms used in the timetable can't be deleted. Mark the room not in use instead.")}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Room deleted.'))
          }}
        />
      )}
    </>
  )
}
