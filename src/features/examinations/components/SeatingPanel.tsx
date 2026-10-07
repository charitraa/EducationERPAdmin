import { Eraser, LayoutGrid, Plus, Printer, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useRoomOptions } from '@/features/academics/rooms/hooks/useRooms'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { errorMessage } from '@/lib/errors'
import { optionalWholeNumber } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Exam, ExamRoom, Invigilation, Seat, SeatPlanResult } from '../api/examinations.api'
import {
  useClearSeatPlan,
  useCreateExamRoom,
  useCreateInvigilation,
  useExamRooms,
  useInvigilations,
  usePapers,
  useRemoveExamRoom,
  useRemoveInvigilation,
  useSeatPlan,
  useSeats,
} from '../hooks/useExaminations'
import { tr } from '@/lib/i18n'

const roomSchema = z.object({ room: z.string().min(1, tr('Choose a room.')), capacity: optionalWholeNumber })

function AddRoomDialog({ exam, open, onOpenChange }: { exam: Exam; open: boolean; onOpenChange: (o: boolean) => void }) {
  const rooms = useRoomOptions(exam.campus)
  const create = useCreateExamRoom()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Use a room for this exam')}
      submitLabel={tr('Add room')}
      schema={roomSchema}
      defaultValues={{ room: '', capacity: '' }}
      onSubmit={async (v) => {
        await create.mutateAsync({ exam: exam.id, room: Number(v.room), capacity: v.capacity ? Number(v.capacity) : null })
        toast.success(tr('Room added.'))
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          <FormField label={tr('Room')} required error={errors.room?.message}>
            {(p) => <Controller control={control} name="room" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={rooms.data ?? []} loading={rooms.isPending} />} />}
          </FormField>
          <FormField label={tr('Seats for this exam')} error={errors.capacity?.message} description={tr('Empty: the room’s own capacity.')}>
            <Input {...register('capacity')} inputMode="numeric" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

const dutySchema = z.object({ exam_subject: z.string().min(1, tr('Choose a paper.')), exam_room: z.string().min(1, tr('Choose a room.')), staff: z.string().min(1, tr('Choose someone.')), is_chief: z.boolean() })

function DutyDialog({ exam, rooms, open, onOpenChange }: { exam: Exam; rooms: ExamRoom[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const papers = usePapers(exam.id)
  const staff = useStaffOptions(exam.campus)
  const create = useCreateInvigilation()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Assign an invigilator')}
      submitLabel={tr('Assign')}
      schema={dutySchema}
      defaultValues={{ exam_subject: '', exam_room: '', staff: '', is_chief: false }}
      onSubmit={async (v) => {
        await create.mutateAsync({ exam_subject: Number(v.exam_subject), exam_room: Number(v.exam_room), staff: Number(v.staff), is_chief: v.is_chief })
        toast.success(tr('Invigilator assigned.'))
      }}
    >
      {({ control, formState: { errors } }) => (
        <>
          <FormField label={tr('Paper')} required error={errors.exam_subject?.message}>
            {(p) => <Controller control={control} name="exam_subject" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(papers.data ?? []).map((x) => ({ value: String(x.id), label: tr('{subject_name} · level {level}{value}', { subject_name: x.subject_name, level: x.level, value: x.date ? ` · ${x.date}` : '' }) }))} />} />}
          </FormField>
          <FormField label={tr('Room')} required error={errors.exam_room?.message}>
            {(p) => <Controller control={control} name="exam_room" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={rooms.map((r) => ({ value: String(r.id), label: r.room_name }))} />} />}
          </FormField>
          <FormField label={tr('Staff member')} required error={errors.staff?.message}>
            {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} />} />}
          </FormField>
          <Controller
            control={control}
            name="is_chief"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Chief invigilator for the room')}
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

/** Rooms used, who sits where, and who watches each room during each paper. */
export function SeatingPanel({ exam }: { exam: Exam }) {
  const { can } = usePermissions()
  const manage = can(PERMS.exams.manage) && exam.status !== 'published'
  const rooms = useExamRooms(exam.id)
  const duties = useInvigilations(exam.id)
  const list = useListState({ filters: [] })
  const seats = useSeats({ ...list.query, exam: exam.id, ordering: undefined })
  const removeRoom = useRemoveExamRoom()
  const removeDuty = useRemoveInvigilation()
  const seatPlan = useSeatPlan()
  const clear = useClearSeatPlan()
  const [addingRoom, setAddingRoom] = useState(false)
  const [addingDuty, setAddingDuty] = useState(false)
  const [preview, setPreview] = useState<SeatPlanResult | null>(null)
  const [clearing, setClearing] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState<ExamRoom | null>(null)
  const [deletingDuty, setDeletingDuty] = useState<Invigilation | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)

  const seatColumns: Column<Seat>[] = [
    { id: 'room', header: tr('Room'), cell: (s) => s.room_name },
    { id: 'seat', header: tr('Seat'), className: 'tabular-nums', cell: (s) => s.seat_number },
    { id: 'student', header: tr('Student'), mobile: 'title', cell: (s) => <span className="font-medium">{s.student_name}</span> },
    { id: 'section', header: tr('Class'), cell: (s) => s.section_name },
  ]

  const previewPlan = async () => {
    setPlanError(null)
    try {
      setPreview((await seatPlan.mutateAsync({ id: exam.id, strategy: 'interleave', dry_run: true })) as SeatPlanResult)
    } catch (err) {
      setPlanError(errorMessage(err))
    }
  }

  return (
    <div className="grid gap-8">
      <section>
        <SectionHeader
          title={tr('Rooms')}
          action={
            manage && (
              <Button variant="outline" onClick={() => setAddingRoom(true)}>
                <Plus aria-hidden /> {tr('Add room')}
              </Button>
            )
          }
        />
        {rooms.isPending ? (
          <TableSkeleton rows={2} columns={3} />
        ) : rooms.isError ? (
          <ErrorState error={rooms.error} onRetry={() => void rooms.refetch()} />
        ) : rooms.data.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('No rooms yet. Add the rooms candidates sit in, then make the seat plan.')}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {rooms.data.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 font-medium">{r.room_name}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{tr('{seats} seats', { seats: r.seats ?? '?' })}</span>
                {manage && <RowActions actions={[{ label: tr('Remove'), icon: Trash2, destructive: true, onSelect: () => setDeletingRoom(r) }]} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader
          title={tr('Seat plan')}
          description={tr('Students from different classes alternate, so neighbours aren’t classmates. Making a new plan replaces the old one.')}
          action={
            <div className="flex gap-2">
              {(seats.data?.count ?? 0) > 0 && (
                <Button asChild variant="outline">
                  <Link to={`/examinations/${exam.id}/seating/print`}>
                    <Printer aria-hidden /> {tr('Print')}
                  </Link>
                </Button>
              )}
              {manage && (seats.data?.count ?? 0) > 0 && (
                  <Button variant="outline" onClick={() => setClearing(true)}>
                    <Eraser aria-hidden /> {tr('Clear')}
                  </Button>
                )}
              {manage && (
                <Button onClick={() => void previewPlan()} disabled={exam.status === 'draft' || seatPlan.isPending}>
                  <LayoutGrid aria-hidden /> {tr('Make seat plan')}
                </Button>
              )}
            </div>
          }
        />
        {manage && exam.status === 'draft' && <p className="mb-2 text-sm text-muted-foreground">{tr('Schedule the exam first: seating follows who sits it.')}</p>}
        {planError && <p className="mb-2 rounded-md border border-danger/20 bg-danger-soft p-2 text-sm text-danger">{planError}</p>}
        <DataTable ariaLabel={tr('Seats')} columns={seatColumns} query={seats} list={list} getRowId={(s) => s.id} searchable={false} empty={{ title: tr('No seat plan yet') }} />
      </section>

      <section>
        <SectionHeader
          title={tr('Invigilators')}
          action={
            manage && (
              <Button variant="outline" onClick={() => setAddingDuty(true)} disabled={!rooms.data?.length}>
                <UserPlus aria-hidden /> {tr('Assign')}
              </Button>
            )
          }
        />
        {duties.isPending ? (
          <TableSkeleton rows={2} columns={3} />
        ) : duties.isError ? (
          <ErrorState error={duties.error} onRetry={() => void duties.refetch()} />
        ) : duties.data.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('Nobody assigned yet.')}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {duties.data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="flex-1 font-medium">
                  {d.staff_name}
                  {d.is_chief && <span className="ml-2 rounded border px-1.5 py-0.5 text-[11px] font-normal">{tr('Chief')}</span>}
                </span>
                <span className="text-sm text-muted-foreground">
                  {d.subject_name} · {d.room_name}
                </span>
                {manage && <RowActions actions={[{ label: tr('Remove'), icon: Trash2, destructive: true, onSelect: () => setDeletingDuty(d) }]} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <AddRoomDialog exam={exam} open={addingRoom} onOpenChange={setAddingRoom} />
      <DutyDialog exam={exam} rooms={rooms.data ?? []} open={addingDuty} onOpenChange={setAddingDuty} />
      <ConfirmDialog
        open={preview != null}
        onOpenChange={(o) => !o && setPreview(null)}
        title={tr('Make this seat plan?')}
        description={preview ? tr('{students} students in {seats} seats: {map}.', { students: preview.students, seats: preview.seats, map: preview.rooms.map((r) => `${r.room} ${r.students}`).join(', ') }) : undefined}
        confirmLabel={tr('Make seat plan')}
        onConfirm={async () => {
          const r = (await seatPlan.mutateAsync({ id: exam.id, strategy: 'interleave', dry_run: false })) as SeatPlanResult
          toast.success(tr('{students} students seated.', { students: r.students }))
        }}
      />
      <ConfirmDialog
        open={clearing}
        onOpenChange={setClearing}
        title={tr('Clear the seat plan?')}
        description={tr('Every seat is removed. Admit cards stay, but won’t show a seat until a new plan is made.')}
        confirmLabel={tr('Clear')}
        tone="destructive"
        onConfirm={async () => {
          await clear.mutateAsync(exam.id)
          toast.success(tr('Seat plan cleared.'))
        }}
      />
      <DeleteDialog
        open={deletingRoom != null}
        onOpenChange={(o) => !o && setDeletingRoom(null)}
        subject={deletingRoom ? tr('{room_name} from this exam', { room_name: deletingRoom.room_name }) : tr('this room')}
        confirmLabel={tr('Remove')}
        description={tr('Seats and invigilators in it are removed too.')}
        onConfirm={async () => {
          await removeRoom.mutateAsync(deletingRoom!.id)
          toast.success(tr('Room removed.'))
        }}
      />
      <DeleteDialog
        open={deletingDuty != null}
        onOpenChange={(o) => !o && setDeletingDuty(null)}
        subject={tr('this duty')}
        confirmLabel={tr('Remove')}
        description={deletingDuty ? tr('{staff_name} no longer watches {room_name} for {subject_name}.', { staff_name: deletingDuty.staff_name, room_name: deletingDuty.room_name, subject_name: deletingDuty.subject_name }) : undefined}
        onConfirm={async () => {
          await removeDuty.mutateAsync(deletingDuty!.id)
          toast.success(tr('Removed.'))
        }}
      />
    </div>
  )
}
