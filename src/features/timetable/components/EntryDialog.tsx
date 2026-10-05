import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { useClassAssignments } from '@/features/academics/teaching/hooks/useTeaching'
import { useRoomOptions } from '@/features/academics/rooms/hooks/useRooms'
import { toast } from '@/hooks/useToast'
import { enumLabel } from '@/lib/formatters'
import { requiredId, toNullableInt } from '@/lib/validation'
import type { Id } from '@/shared/types/api'
import { hhmm, WEEKDAYS, type Entry, type Period } from '../api/timetable.api'
import { useCreateEntry, useRemoveEntry, useUpdateEntry } from '../hooks/useTimetable'
import { tr } from '@/lib/i18n'

const schema = z.object({ teaching_assignment: requiredId(tr('Choose what is taught.')), day_of_week: requiredId(), period: requiredId(), room: z.string() })

export interface EntrySlot {
  /** Editing: the lesson. Adding: null. */
  entry: Entry | null
  section: Id
  campus: Id
  day: number
  period: Period
}

/**
 * Add or edit one weekly lesson of a class. A clash with a teacher, room or
 * class comes back as 409 timetable_clash and is shown as the form's message.
 */
export function EntryDialog({ slot, periods, onClose }: { slot: EntrySlot | null; periods: Period[]; onClose: () => void }) {
  const assignments = useClassAssignments(slot?.section ?? null)
  const rooms = useRoomOptions(slot?.campus)
  const create = useCreateEntry()
  const update = useUpdateEntry()
  const remove = useRemoveEntry()
  const [deleting, setDeleting] = useState(false)
  const entry = slot?.entry ?? null

  return (
    <>
      <FormDialog
        open={slot !== null}
        onOpenChange={(o) => !o && onClose()}
        title={entry ? `${entry.subject_name} · ${entry.section_name}` : tr('Add a lesson')}
        description={
          slot
            ? `${WEEKDAYS.find((d) => d.value === slot.day)?.label}, ${slot.period.name} (${hhmm(slot.period.start_time)}–${hhmm(slot.period.end_time)})${entry?.combined_group ? ' · combined class' : ''}`
            : undefined
        }
        submitLabel={entry ? tr('Save') : tr('Add lesson')}
        schema={schema}
        defaultValues={{
          teaching_assignment: entry ? String(entry.teaching_assignment) : '',
          day_of_week: slot ? String(slot.day) : '',
          period: slot ? String(slot.period.id) : '',
          room: entry?.room ? String(entry.room) : '',
        }}
        onSubmit={async (v) => {
          const input = {
            teaching_assignment: Number(v.teaching_assignment),
            day_of_week: Number(v.day_of_week) as Entry['day_of_week'],
            period: Number(v.period),
            // Left empty on a new lesson, the class's home room is used.
            ...(v.room || entry ? { room: toNullableInt(v.room) } : {}),
          }
          if (entry) await update.mutateAsync({ id: entry.id, input })
          else await create.mutateAsync(input)
          toast.success(entry ? tr('Lesson updated from today.') : tr('Lesson added.'))
        }}
      >
        {({ control, formState: { errors } }) => (
          <>
            <FormField
              label={tr('Subject and teacher')}
              required
              error={errors.teaching_assignment?.message}
              description={assignments.data?.length === 0 ? tr('This class has no teachers assigned yet: add them under Academics → Teaching.') : undefined}
            >
              {(p) => (
                <Controller
                  control={control}
                  name="teaching_assignment"
                  render={({ field }) => (
                    <SelectControl
                      {...p}
                      value={field.value}
                      onChange={field.onChange}
                      loading={assignments.isPending}
                      options={(assignments.data ?? []).map((a) => ({ value: String(a.id), label: `${a.subject_name} · ${a.teacher_name}${a.role !== 'lecture' ? ` (${enumLabel('TeachingAssignmentRoleEnum', a.role)})` : ''}` }))}
                    />
                  )}
                />
              )}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={tr('Day')} error={errors.day_of_week?.message}>
                {(p) => <Controller control={control} name="day_of_week" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={WEEKDAYS.map((d) => ({ value: String(d.value), label: d.label }))} />} />}
              </FormField>
              <FormField label={tr('Period')} error={errors.period?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="period"
                    render={({ field }) => (
                      <SelectControl {...p} value={field.value} onChange={field.onChange} options={periods.filter((x) => !x.is_break).map((x) => ({ value: String(x.id), label: `${x.name} · ${hhmm(x.start_time)}` }))} />
                    )}
                  />
                )}
              </FormField>
              <FormField label={tr('Room')} error={errors.room?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="room"
                    render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={entry ? tr('No room') : tr('Class’s home room')} loading={rooms.isPending} options={rooms.data ?? []} />}
                  />
                )}
              </FormField>
            </div>
            {entry && (
              <div className="flex justify-start">
                <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => setDeleting(true)}>
                  <Trash2 aria-hidden /> {tr('Remove this lesson')}
                </Button>
              </div>
            )}
          </>
        )}
      </FormDialog>
      {entry && (
        <DeleteDialog
          open={deleting}
          onOpenChange={setDeleting}
          subject={tr('{subject_name} on {day_name}, {period_name}', { subject_name: entry.subject_name, day_name: entry.day_name, period_name: entry.period_name })}
          description={tr('It stops from today; lessons it already had (and their attendance) stay in the record.')}
          confirmLabel={tr('Remove')}
          onConfirm={async () => {
            await remove.mutateAsync(entry.id)
            toast.success(tr('Lesson removed.'))
            onClose()
          }}
        />
      )}
    </>
  )
}
