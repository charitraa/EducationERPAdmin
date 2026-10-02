import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRoomOptions } from '@/features/academics/rooms/hooks/useRooms'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { toNullableInt } from '@/lib/validation'
import type { Id } from '@/shared/types/api'
import { hhmm, type Lesson } from '../api/timetable.api'
import { useCreateLessonChange, useRemoveLessonChange, useUpdateLessonChange } from '../hooks/useTimetable'

const schema = z
  .object({ what: z.enum(['substitute', 'room', 'cancel']), substitute_teacher: z.string(), room: z.string(), note: z.string().trim().max(255) })
  .refine((v) => v.what !== 'substitute' || v.substitute_teacher, { path: ['substitute_teacher'], message: 'Choose who covers it.' })
  .refine((v) => v.what !== 'room' || v.room, { path: ['room'], message: 'Choose the room.' })

/** One lesson on one date: a substitute teacher, another room, or cancelled. The weekly lesson is untouched. */
export function LessonChangeDialog({ lesson, campus, onClose }: { lesson: Lesson | null; campus: Id | null; onClose: () => void }) {
  const staff = useStaffOptions(campus)
  const rooms = useRoomOptions(campus)
  const create = useCreateLessonChange()
  const update = useUpdateLessonChange()
  const remove = useRemoveLessonChange()
  const [removing, setRemoving] = useState(false)
  const existing = lesson?.change ?? null
  const substitute = lesson && lesson.teacher !== lesson.regular_teacher ? String(lesson.teacher) : ''

  return (
    <>
      <FormDialog
        open={lesson !== null}
        onOpenChange={(o) => !o && onClose()}
        title={lesson ? `${lesson.subject_name} · ${lesson.section_name}` : ''}
        description={lesson ? `${formatDate(lesson.date)}, ${lesson.period_name} (${hhmm(lesson.start_time)}–${hhmm(lesson.end_time)}). Only this day changes.` : undefined}
        submitLabel="Save change"
        schema={schema}
        defaultValues={{
          what: lesson?.is_cancelled ? 'cancel' : substitute ? 'substitute' : existing ? 'room' : 'substitute',
          substitute_teacher: substitute,
          room: existing && lesson?.room ? String(lesson.room) : '',
          note: lesson?.note ?? '',
        }}
        onSubmit={async (v) => {
          const input = {
            entry: lesson!.entry,
            date: lesson!.date,
            is_cancelled: v.what === 'cancel',
            substitute_teacher: v.what === 'cancel' ? null : toNullableInt(v.substitute_teacher),
            room: v.what === 'cancel' ? null : toNullableInt(v.room),
            note: v.note,
          }
          if (existing) await update.mutateAsync({ id: existing, input })
          else await create.mutateAsync(input)
          toast.success(v.what === 'cancel' ? 'Lesson cancelled for that day.' : 'Change saved.')
        }}
      >
        {({ register, control, watch, formState: { errors } }) => {
          const what = watch('what')
          return (
            <>
              <div className="inline-flex w-fit rounded-md border p-0.5" role="radiogroup" aria-label="What changes">
                {(
                  [
                    ['substitute', 'Someone covers it'],
                    ['room', 'Another room'],
                    ['cancel', 'Cancelled'],
                  ] as const
                ).map(([value, label]) => (
                  <Controller
                    key={value}
                    control={control}
                    name="what"
                    render={({ field }) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={field.value === value}
                        onClick={() => field.onChange(value)}
                        className={field.value === value ? 'rounded bg-primary px-3 py-1 text-sm text-primary-foreground' : 'rounded px-3 py-1 text-sm text-muted-foreground hover:text-foreground'}
                      >
                        {label}
                      </button>
                    )}
                  />
                ))}
              </div>
              {what !== 'cancel' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Covered by" required={what === 'substitute'} error={errors.substitute_teacher?.message}>
                    {(p) => (
                      <Controller
                        control={control}
                        name="substitute_teacher"
                        render={({ field }) => (
                          <SelectControl
                            {...p}
                            value={field.value}
                            onChange={field.onChange}
                            allowEmpty={what === 'room'}
                            emptyLabel="Their usual teacher"
                            loading={staff.isPending}
                            options={(staff.data ?? []).filter((s) => s.value !== String(lesson?.regular_teacher))}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label="Room" required={what === 'room'} error={errors.room?.message}>
                    {(p) => (
                      <Controller
                        control={control}
                        name="room"
                        render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty={what === 'substitute'} emptyLabel="Usual room" loading={rooms.isPending} options={rooms.data ?? []} />}
                      />
                    )}
                  </FormField>
                </div>
              )}
              <FormField label="Note" error={errors.note?.message} description="Shown on the day’s timetable.">
                <Input {...register('note')} maxLength={255} placeholder={what === 'cancel' ? 'Teacher on leave, school trip…' : ''} />
              </FormField>
              {existing && (
                <Button type="button" variant="ghost" size="sm" className="w-fit text-danger" onClick={() => setRemoving(true)}>
                  Undo the change (back to normal)
                </Button>
              )}
            </>
          )
        }}
      </FormDialog>
      {existing && (
        <DeleteDialog
          open={removing}
          onOpenChange={setRemoving}
          subject="this change"
          confirmLabel="Undo change"
          description="The lesson runs as usual that day."
          onConfirm={async () => {
            await remove.mutateAsync(existing)
            toast.success('Back to normal.')
            onClose()
          }}
        />
      )}
    </>
  )
}
