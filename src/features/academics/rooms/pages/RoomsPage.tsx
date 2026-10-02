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

export default function RoomsPage() {
  const { isMultiBranch, branches, selectedBranchId } = useBranches()
  const list = useListState({ filters: ['campus', 'room_type', 'is_active'], defaultOrdering: 'code' })
  // The header's branch choice applies unless the user picked one here.
  const query = useRooms({ ...list.query, campus: list.filters.campus ?? selectedBranchId ?? undefined })
  const crud = useCrudState<Room>()
  const remove = useRemoveRoom()

  const columns: Column<Room>[] = [
    { id: 'code', header: 'Code', sortField: 'code', className: 'w-28 font-mono text-xs', mobile: 'hidden', cell: (r) => r.code },
    { id: 'name', header: 'Room', sortField: 'name', mobile: 'title', cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'type', header: 'Type', cell: (r) => enumLabel('RoomTypeEnum', r.room_type) },
    { id: 'where', header: 'Location', cell: (r) => [r.building, r.floor && `Floor ${r.floor}`].filter(Boolean).join(' · ') || '—' },
    { id: 'campus', header: 'Branch', hidden: !isMultiBranch, cell: (r) => r.campus_name },
    { id: 'capacity', header: 'Seats', sortField: 'capacity', className: 'tabular-nums', cell: (r) => r.capacity ?? '—' },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.is_active === false ? 'inactive' : 'active'} label={r.is_active === false ? 'Not in use' : 'In use'} /> },
  ]

  return (
    <>
      <SectionHeader
        title="Rooms"
        description="Classrooms, labs and halls, for home rooms and the timetable."
        action={
          <PermissionGate permission={PERMS.academics.classes}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add room
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel="Rooms"
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder="Search code, name, building…"
        filters={[
          { name: 'campus', label: 'Branch', hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
          { name: 'room_type', label: 'Type', options: enumOptions('RoomTypeEnum') },
          { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'In use' }, { value: 'false', label: 'Not in use' }] },
        ]}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.academics.classes, onSelect: () => crud.openEdit(r) },
              { label: 'Delete', icon: Trash2, permission: PERMS.academics.classes, destructive: true, onSelect: () => crud.openDelete(r) },
            ]}
          />
        )}
        empty={{
          title: 'No rooms yet',
          description: 'Add rooms when you want home rooms for classes or a room-aware timetable.',
          action: (
            <PermissionGate permission={PERMS.academics.classes}>
              <Button variant="outline" onClick={crud.openCreate}>
                Add a room
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
          subject={`room ${crud.deleting.code}`}
          description="Rooms used in the timetable can't be deleted. Mark the room not in use instead."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Room deleted.')
          }}
        />
      )}
    </>
  )
}
