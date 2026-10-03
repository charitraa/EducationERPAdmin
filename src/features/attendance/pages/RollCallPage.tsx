import { CheckCheck, Loader2, MoreHorizontal, Pencil, RotateCcw, Save, Search, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { UnsavedChangesDialog } from '@/components/forms/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { formatDate, formatDateTime } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import { TONE_CLASSES } from '@/shared/constants/statuses'
import type { Id } from '@/shared/types/api'
import { hhmm } from '@/features/timetable/api/timetable.api'
import { STATUS_SHORT, STATUS_TONE, STATUSES, type AttendanceStatus, type RosterStudent } from '../api/attendance.api'
import { useCorrectRecord, useMarkSession, useReopenSession, useRoster, useSubmitSession } from '../hooks/useAttendance'

/** The three a teacher taps most; the rest live in the ⋯ menu. */
const QUICK: AttendanceStatus[] = ['present', 'absent', 'late']
const MORE = STATUSES.filter((s) => !QUICK.includes(s))

const ACTIVE: Record<AttendanceStatus, string> = {
  present: 'bg-success text-white border-success',
  absent: 'bg-danger text-white border-danger',
  late: 'bg-warning text-white border-warning',
  excused: 'bg-secondary text-secondary-foreground border-border',
  leave: 'bg-secondary text-secondary-foreground border-border',
  medical_leave: 'bg-secondary text-secondary-foreground border-border',
  on_duty: 'bg-info text-white border-info',
}

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', TONE_CLASSES[STATUS_TONE[status]])}>{enumLabel('AttendanceStatusEnum', status)}</span>
}

type Draft = Record<Id, AttendanceStatus>

const correctSchema = z.object({ status: z.string().min(1, 'Choose a status.'), reason: z.string().trim().min(1, 'Say why it’s changing.').max(255) })

function CorrectDialog({ student, onClose }: { student: RosterStudent | null; onClose: () => void }) {
  const correct = useCorrectRecord()
  return (
    <FormDialog
      open={student !== null}
      onOpenChange={(o) => !o && onClose()}
      title={student ? `Correct ${student.student_name}` : 'Correct'}
      description="This attendance is submitted, so the change is kept as a correction with your reason."
      submitLabel="Save correction"
      schema={correctSchema}
      defaultValues={{ status: student?.status ?? '', reason: '' }}
      onSubmit={async (v) => {
        await correct.mutateAsync({ id: student!.record!, status: v.status as AttendanceStatus, reason: v.reason })
        toast.success('Corrected.')
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          <FormField label="Status" required error={errors.status?.message}>
            {(p) => <Controller control={control} name="status" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('AttendanceStatusEnum')} />} />}
          </FormField>
          <FormField label="Reason" required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder="Medical note brought in, marked by mistake…" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

function StudentRow({
  s,
  status,
  dirty,
  editable,
  canCorrect,
  onSet,
  onCorrect,
}: {
  s: RosterStudent
  status: AttendanceStatus | null
  dirty: boolean
  editable: boolean
  canCorrect: boolean
  onSet: (status: AttendanceStatus) => void
  onCorrect: () => void
}) {
  const other = status != null && !QUICK.includes(status)
  return (
    <li className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4', dirty && 'bg-primary/5')}>
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate font-medium">{s.student_name}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{s.student_number}</span>
          {s.source && s.source !== 'teacher' && !dirty ? ` · ${enumLabel('AttendanceSourceEnum', s.source)}` : ''}
          {s.note ? ` · “${s.note}”` : ''}
        </p>
      </div>
      {editable ? (
        <div className="flex items-center gap-1.5" role="group" aria-label={`Attendance for ${s.student_name}`}>
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              aria-pressed={status === q}
              aria-label={enumLabel('AttendanceStatusEnum', q)}
              title={enumLabel('AttendanceStatusEnum', q)}
              onClick={() => onSet(q)}
              className={cn(
                'h-10 min-w-10 rounded-md border px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                status === q ? ACTIVE[q] : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {STATUS_SHORT[q]}
            </button>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Other statuses for ${s.student_name}`}
                className={cn(
                  'inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  other ? ACTIVE[status] : 'bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                {other ? STATUS_SHORT[status] : <MoreHorizontal className="h-4 w-4" aria-hidden />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mark as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MORE.map((m) => (
                <DropdownMenuItem key={m} onSelect={() => onSet(m)}>
                  {enumLabel('AttendanceStatusEnum', m)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {status ? <AttendanceStatusBadge status={status} /> : <span className="text-xs text-muted-foreground">Not marked</span>}
          {canCorrect && s.record != null && (
            <Button size="sm" variant="ghost" onClick={onCorrect} aria-label={`Correct ${s.student_name}`}>
              <Pencil aria-hidden />
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

/** One roll call: mark everyone (P / A / L in one tap), save as you go, then submit. */
export default function RollCallPage() {
  const id = Number(useParams().id)
  const roster = useRoster(Number.isFinite(id) ? id : null)
  const mark = useMarkSession()
  const submit = useSubmitSession()
  const reopen = useReopenSession()
  const { can } = usePermissions()
  const [draft, setDraft] = useState<Draft>({})
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [rest, setRest] = useState<AttendanceStatus>('present')
  const [reopening, setReopening] = useState(false)
  const [correcting, setCorrecting] = useState<RosterStudent | null>(null)
  const [error, setError] = useState<string | null>(null)

  const students = roster.data?.students ?? []
  const session = roster.data?.session
  const submitted = session?.status === 'submitted'
  const saved = useMemo(() => Object.fromEntries(students.filter((s) => s.status).map((s) => [s.enrollment, s.status!])) as Draft, [students])
  const changes = Object.entries(draft).filter(([e, st]) => saved[Number(e)] !== st)
  const blocker = useUnsavedChanges(changes.length > 0)

  // Drop draft entries the server now agrees with (after a save or refetch).
  useEffect(() => {
    setDraft((d) => {
      const next = Object.fromEntries(Object.entries(d).filter(([e, st]) => saved[Number(e)] !== st))
      return Object.keys(next).length === Object.keys(d).length ? d : next
    })
  }, [saved])

  if (roster.isPending) return <PageLoader />
  if (roster.isError) return <ErrorState error={roster.error} onRetry={() => void roster.refetch()} />
  if (!session) return null

  const statusOf = (s: RosterStudent) => draft[s.enrollment] ?? s.status
  const counts = STATUSES.reduce<Record<string, number>>((acc, st) => ({ ...acc, [st]: students.filter((s) => statusOf(s) === st).length }), {})
  const unmarked = students.filter((s) => statusOf(s) == null)
  const q = search.trim().toLowerCase()
  const shown = q ? students.filter((s) => s.student_name.toLowerCase().includes(q) || s.student_number.toLowerCase().includes(q)) : students
  const busy = mark.isPending || submit.isPending

  const set = (enrollment: Id, status: AttendanceStatus) => setDraft((d) => ({ ...d, [enrollment]: status }))
  const markRestPresent = () => setDraft((d) => ({ ...d, ...Object.fromEntries(unmarked.map((s) => [s.enrollment, 'present'])) }))

  const save = async () => {
    if (changes.length === 0) return
    setError(null)
    await mark.mutateAsync({ id, records: changes.map(([e, status]) => ({ enrollment: Number(e), status })) })
  }

  const onSave = async () => {
    try {
      await save()
      toast.success('Saved. Submit when everyone is marked.')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const onSubmit = async () => {
    await save()
    await submit.mutateAsync({ id, rest: unmarked.length ? rest : undefined })
    toast.success('Attendance submitted.')
  }

  const title = session.kind === 'lesson' ? `${session.subject_name ?? 'Lesson'} · ${session.section_name}` : `Roll call · ${session.section_name}`
  const when = [formatDate(session.date), session.start_time ? hhmm(session.start_time) : null, session.teacher_name].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        backTo="/attendance"
        title={title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {when}
            {submitted ? <StatusBadge status="submitted" label="Submitted" /> : <StatusBadge status="open" label="Open" />}
          </span>
        }
        actions={
          submitted &&
          can(PERMS.attendance.manage) && (
            <Button variant="outline" onClick={() => setReopening(true)}>
              <RotateCcw aria-hidden /> Reopen
            </Button>
          )
        }
      />

      {submitted && (
        <p className="mb-4 rounded-lg border border-info/20 bg-info-soft p-3 text-sm">
          Submitted {session.submitted_at ? formatDateTime(session.submitted_at) : ''}. Changes now are corrections and need a reason
          {can(PERMS.attendance.manage) ? '; or reopen it to mark again.' : '.'}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {STATUSES.filter((st) => counts[st] || QUICK.includes(st)).map((st) => (
          <span key={st} className={cn('rounded-full border px-2 py-0.5 font-medium', TONE_CLASSES[STATUS_TONE[st]])}>
            {enumLabel('AttendanceStatusEnum', st)} {counts[st]}
          </span>
        ))}
        {unmarked.length > 0 && <span className="rounded-full border px-2 py-0.5 font-medium text-muted-foreground">Not marked {unmarked.length}</span>}
        <span className="ml-auto text-muted-foreground">{students.length} students</span>
      </div>

      {students.length === 0 ? (
        <EmptyState title="No students expected" description="Nobody was placed in this class on that date." />
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b p-2 sm:px-4">
            <div className="relative min-w-40 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a student…" aria-label="Find a student" className="pl-8" />
            </div>
            {!submitted && unmarked.length > 0 && (
              <Button variant="outline" onClick={markRestPresent}>
                <CheckCheck aria-hidden /> Mark the other {unmarked.length} present
              </Button>
            )}
          </div>
          <ul className="divide-y">
            {shown.map((s) => (
              <StudentRow
                key={s.enrollment}
                s={s}
                status={statusOf(s)}
                dirty={draft[s.enrollment] != null && draft[s.enrollment] !== s.status}
                editable={!submitted}
                canCorrect={submitted && can(PERMS.attendance.mark)}
                onSet={(st) => set(s.enrollment, st)}
                onCorrect={() => setCorrecting(s)}
              />
            ))}
            {shown.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No student matches “{search}”.</li>}
          </ul>
        </div>
      )}

      {!submitted && students.length > 0 && (
        // Above the phone's bottom navigation (h-14), at the bottom of the screen on desktop.
        <div className="sticky bottom-16 z-20 mt-4 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
          <FormError message={error} className="mb-2" />
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm text-muted-foreground">
              {changes.length ? `${changes.length} unsaved` : 'All saved'}
              {unmarked.length ? ` · ${unmarked.length} not marked` : ''}
            </p>
            <Button variant="outline" onClick={() => void onSave()} disabled={busy || changes.length === 0}>
              {mark.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />} Save
            </Button>
            <Button onClick={() => setSubmitting(true)} disabled={busy}>
              <Send aria-hidden /> Submit
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={submitting}
        onOpenChange={setSubmitting}
        title="Submit attendance?"
        description={`${counts.present ?? 0} present, ${counts.absent ?? 0} absent, ${counts.late ?? 0} late. Parents of absent students are notified. After this, changes need a reason.`}
        confirmLabel="Submit"
        onConfirm={onSubmit}
      >
        {unmarked.length > 0 && (
          <FormField label={`Mark the ${unmarked.length} not marked as`}>
            {(p) => <SelectControl {...p} value={rest} onChange={(v) => setRest(v as AttendanceStatus)} options={enumOptions('AttendanceStatusEnum')} />}
          </FormField>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={reopening}
        onOpenChange={setReopening}
        title="Reopen this attendance?"
        description="The teacher can mark it again and must submit it again. Records stay as they are."
        confirmLabel="Reopen"
        onConfirm={async () => {
          await reopen.mutateAsync(id)
          toast.success('Reopened.')
        }}
      />
      <CorrectDialog student={correcting} onClose={() => setCorrecting(null)} />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  )
}
