import { Check, CheckCheck, Medal, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { toast } from '@/hooks/useToast'
import { splitLocal, todayIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { optionalWholeNumber, toNullableInt } from '@/lib/validation'
import type { Id } from '@/shared/types/api'
import type { Event, ParticipationRole, RosterRow } from '../api/events.api'
import { useMarkAttendance, useRecordParticipation, useRegisterStudent, useRoster } from '../hooks/useEvents'
import { tr } from '@/lib/i18n'

/** Check-in and results need a published event whose day has come (the backend's ensure_held). */
export function isHeld(e: Event) {
  return e.status === 'published' && splitLocal(e.start_at).date <= todayIso()
}

const roleSchema = z.object({
  student: z.string().min(1, tr('Choose a student.')),
  role: z.string().min(1, tr('Choose a role.')),
  position: optionalWholeNumber,
  remark: z.string().trim().max(255),
})

function RecordRoleDialog({ event, roster, student, onClose }: { event: Event; roster: RosterRow[]; student: Id | null | 'new'; onClose: () => void }) {
  const record = useRecordParticipation()
  return (
    <FormDialog
      open={student !== null}
      onOpenChange={(o) => !o && onClose()}
      title={tr('Record a role or result')}
      description={tr('Winners and runners-up can have a place (1st, 2nd…). Points for the role are given the first time it’s recorded.')}
      submitLabel={tr('Record')}
      schema={roleSchema}
      defaultValues={{ student: typeof student === 'number' ? String(student) : '', role: 'participant', position: '', remark: '' }}
      onSubmit={async (v) => {
        await record.mutateAsync({ id: event.id, student: Number(v.student), role: v.role as ParticipationRole, position: toNullableInt(v.position), remark: v.remark })
        toast.success(tr('Recorded.'))
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <FormField label={tr('Student')} required error={errors.student?.message}>
            {(p) => (
              <Controller
                control={control}
                name="student"
                render={({ field }) => (
                  <SelectControl {...p} value={field.value} onChange={field.onChange} options={roster.map((r) => ({ value: String(r.student), label: `${r.student_name} (${r.student_number})` }))} placeholder={roster.length ? tr('Choose…') : tr('Nobody on the roster yet')} />
                )}
              />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Role')} required error={errors.role?.message}>
              {(p) => <Controller control={control} name="role" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ParticipationRoleEnum')} />} />}
            </FormField>
            {['winner', 'runner_up'].includes(watch('role')) && (
              <FormField label={tr('Place')} error={errors.position?.message} description={tr('1 for first, 2 for second…')}>
                <Input {...register('position')} inputMode="numeric" />
              </FormField>
            )}
          </div>
          <FormField label={tr('Remark')} error={errors.remark?.message}>
            <Input {...register('remark')} maxLength={255} placeholder={tr('100 m sprint, Under-14…')} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** For sign-up events: the office registers a student. For no-sign-up events: check a student in directly. */
function AddStudentDialog({ event, open, onOpenChange, onAdded }: { event: Event; open: boolean; onOpenChange: (o: boolean) => void; onAdded: () => void }) {
  const registerStudent = useRegisterStudent()
  const mark = useMarkAttendance()
  const signUp = event.registration_mode !== 'none'
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={signUp ? tr('Register a student') : tr('Check a student in')}
      description={signUp ? (event.registration_mode === 'approval' ? tr('Registered by the office, so it’s confirmed straight away.') : undefined) : tr('This event has no sign-up: students are added as they’re checked in.')}
      submitLabel={signUp ? tr('Register') : tr('Mark present')}
      schema={z.object({ student: z.custom<Student | null>().refine((s) => s != null, tr('Choose a student.')) })}
      defaultValues={{ student: null }}
      onSubmit={async (v) => {
        if (signUp) await registerStudent.mutateAsync({ event: event.id, student: v.student!.id, note: '' })
        else await mark.mutateAsync({ id: event.id, entries: [{ student: v.student!.id, status: 'present' }] })
        toast.success(signUp ? tr('{full_name} registered.', { full_name: v.student!.full_name }) : tr('{full_name} checked in.', { full_name: v.student!.full_name }))
        onAdded()
      }}
    >
      {({ control, formState: { errors } }) => (
        <FormField label={tr('Student')} required error={errors.student?.message}>
          {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
        </FormField>
      )}
    </FormDialog>
  )
}

/** Everyone tied to the event, with check-in buttons and their roles. */
export function EventRoster({ event, canRun }: { event: Event; canRun: boolean }) {
  const roster = useRoster(event.id)
  const mark = useMarkAttendance()
  const [adding, setAdding] = useState(false)
  const [roleFor, setRoleFor] = useState<Id | 'new' | null>(null)
  const held = isHeld(event)
  const signUp = event.registration_mode !== 'none'
  const cancelled = event.status === 'cancelled'

  const setStatus = async (entries: Array<{ student: Id; status: 'present' | 'absent' }>) => {
    try {
      await mark.mutateAsync({ id: event.id, entries })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (roster.isPending) return <TableSkeleton rows={4} columns={4} />
  if (roster.isError) return <ErrorState error={roster.error} onRetry={() => void roster.refetch()} />
  const rows = roster.data
  const confirmedNotPresent = rows.filter((r) => r.registration_status === 'confirmed' && r.attendance_status !== 'present')

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <p className="mr-auto text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'student' : 'students'}
          {held ? ' · ' + tr('{count} present', { count: rows.filter((r) => r.attendance_status === 'present').length }) : ''}
        </p>
        {canRun && !cancelled && (
          <>
            {held && signUp && confirmedNotPresent.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => void setStatus(confirmedNotPresent.map((r) => ({ student: r.student, status: 'present' })))} disabled={mark.isPending}>
                <CheckCheck aria-hidden /> {tr('Mark all {count} confirmed present', { count: confirmedNotPresent.length })}
              </Button>
            )}
            {held && (
              <Button size="sm" variant="outline" onClick={() => setRoleFor('new')} disabled={rows.length === 0}>
                <Medal aria-hidden /> {tr('Record a result')}
              </Button>
            )}
            {(signUp || held) && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <UserPlus aria-hidden /> {signUp ? tr('Register a student') : tr('Check a student in')}
              </Button>
            )}
          </>
        )}
      </div>
      {!held && !cancelled && (
        <p className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          {event.status === 'draft' ? tr('Publish the event first.') : tr('Check-in and results open on the day of the event.')}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          {signUp ? tr('Nobody has signed up yet.') : tr('Nobody checked in yet. Students appear here as they’re marked present.')}
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.student} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.student_name}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono">{r.student_number}</span>
                  {r.roles.map((role) => (
                    <span key={role} className="rounded border bg-muted/50 px-1.5 py-0.5 text-[11px] text-foreground">
                      {enumLabel('ParticipationRoleEnum', role)}
                    </span>
                  ))}
                </p>
              </div>
              {r.registration_status && r.registration_status !== 'confirmed' && (
                <StatusBadge status={r.registration_status} label={enumLabel('RegistrationStatusEnum', r.registration_status)} />
              )}
              {held && canRun && !cancelled ? (
                <div className="flex overflow-hidden rounded-md border" role="group" aria-label={tr('Attendance for {student_name}', { student_name: r.student_name })}>
                  {(['present', 'absent'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={r.attendance_status === s}
                      disabled={mark.isPending}
                      onClick={() => void setStatus([{ student: r.student, status: s }])}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium',
                        r.attendance_status === s ? (s === 'present' ? 'bg-success text-white' : 'bg-danger text-white') : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {s === 'present' ? <Check className="h-3 w-3" aria-hidden /> : <X className="h-3 w-3" aria-hidden />}
                      {s === 'present' ? tr('Present') : tr('Absent')}
                    </button>
                  ))}
                </div>
              ) : (
                r.attendance_status && <StatusBadge status={r.attendance_status === 'present' ? 'completed' : 'cancelled'} label={r.attendance_status === 'present' ? tr('Present') : tr('Absent')} />
              )}
              {held && canRun && !cancelled && (
                <Button size="sm" variant="ghost" onClick={() => setRoleFor(r.student)} aria-label={tr('Record a result for {student_name}', { student_name: r.student_name })}>
                  <Medal aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <AddStudentDialog event={event} open={adding} onOpenChange={setAdding} onAdded={() => void roster.refetch()} />
      <RecordRoleDialog event={event} roster={rows} student={roleFor} onClose={() => setRoleFor(null)} />
    </div>
  )
}
