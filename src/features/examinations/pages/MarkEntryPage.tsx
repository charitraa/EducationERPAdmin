import { CheckCircle2, Loader2, Save, Send, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { UnsavedChangesDialog } from '@/components/forms/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { formatDate, formatDateTime } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import { sheetsApi, type MarkEntryInput, type MarkStatus, type SheetComponent, type SheetStudent } from '../api/examinations.api'
import { SheetBadge } from '../components/ExamMarksPanel'
import { useEnterMarks, useSheetAction, useSheetRoster } from '../hooks/useExaminations'

/** What a cell can hold besides a number. */
const CODES: Record<string, Exclude<MarkStatus, 'present'>> = { AB: 'absent', EX: 'exempt', WH: 'withheld' }
const CODE_OF: Record<Exclude<MarkStatus, 'present'>, string> = { absent: 'AB', exempt: 'EX', withheld: 'WH' }

const key = (enrollment: Id, component: Id) => `${enrollment}:${component}`

/** The server's mark as the text a cell shows. */
function cellText(m: SheetStudent['marks'][string]): string {
  if (!m) return ''
  return m.status === 'present' ? String(m.marks ?? '') : CODE_OF[m.status]
}

type Parsed = { ok: true; entry: Omit<MarkEntryInput, 'enrollment' | 'component'> } | { ok: false; error: string } | { ok: true; entry: null }

function parse(text: string, c: SheetComponent): Parsed {
  const t = text.trim().toUpperCase()
  if (t === '') return { ok: true, entry: null }
  if (CODES[t]) return { ok: true, entry: { status: CODES[t], marks: null } }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return { ok: false, error: 'A number, or AB, EX, WH.' }
  const n = Number(t)
  if (n > c.full_marks) return { ok: false, error: `At most ${c.full_marks}.` }
  return { ok: true, entry: { status: 'present', marks: n } }
}

/** Spreadsheet-style marks entry: type, Enter or ↓ to the next student, save as you go, submit when complete. */
export default function MarkEntryPage() {
  const id = Number(useParams().id)
  const roster = useSheetRoster(Number.isFinite(id) ? id : null)
  const enter = useEnterMarks()
  const submit = useSheetAction((sid: Id) => sheetsApi.submit(sid))
  const verify = useSheetAction((sid: Id) => sheetsApi.verify(sid))
  const sendBack = useSheetAction(({ sid, reason }: { sid: Id; reason: string }) => sheetsApi.sendBack(sid, reason))
  const { can } = usePermissions()
  const office = can(PERMS.exams.manage)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'submit' | 'verify' | 'sendBack' | 'reason' | null>(null)
  const inputs = useRef(new Map<string, HTMLInputElement>())

  const data = roster.data
  const saved = useMemo(() => {
    const out: Record<string, string> = {}
    for (const s of data?.students ?? []) for (const c of data?.components ?? []) out[key(s.enrollment, c.id)] = cellText(s.marks[String(c.id)] ?? null)
    return out
  }, [data])
  const changed = Object.entries(draft).filter(([k, v]) => (saved[k] ?? '') !== v.trim().toUpperCase() && (saved[k] ?? '') !== v.trim())
  const blocker = useUnsavedChanges(changed.length > 0)

  // Forget draft cells the server now agrees with (after a save).
  useEffect(() => {
    setDraft((d) => {
      const next = Object.fromEntries(Object.entries(d).filter(([k, v]) => (saved[k] ?? '') !== v.trim().toUpperCase() && (saved[k] ?? '') !== v.trim()))
      return Object.keys(next).length === Object.keys(d).length ? d : next
    })
  }, [saved])

  if (roster.isPending) return <PageLoader />
  if (roster.isError) return <ErrorState error={roster.error} onRetry={() => void roster.refetch()} />
  const { sheet, components, students } = roster.data
  const locked = sheet.status !== 'open'
  const editable = !locked || office

  const textOf = (k: string) => draft[k] ?? saved[k] ?? ''
  const problems = new Map<string, string>()
  const entries: MarkEntryInput[] = []
  for (const [k, v] of changed) {
    const [enrollment, component] = k.split(':').map(Number) as [number, number]
    const c = components.find((x) => x.id === component)!
    const p = parse(v, c)
    if (!p.ok) problems.set(k, p.error)
    else if (p.entry === null) problems.set(k, 'A mark can’t be cleared: enter a number or AB.')
    else entries.push({ enrollment, component, ...p.entry })
  }
  const missing = students.reduce((n, s) => n + components.filter((c) => textOf(key(s.enrollment, c.id)) === '').length, 0)

  const save = async (reason?: string) => {
    if (problems.size) throw new Error(`Fix the ${problems.size} highlighted mark${problems.size === 1 ? '' : 's'} first.`)
    if (entries.length) await enter.mutateAsync({ id, entries, reason })
  }

  const onSave = async () => {
    setError(null)
    if (locked) return setDialog('reason')
    try {
      await save()
      toast.success('Marks saved.')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  /** Enter and ↓ go to the same component for the next student; ↑ to the previous one. */
  const onKey = (e: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const move = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!move) return
    e.preventDefault()
    const next = students[row + move]
    if (next) inputs.current.get(key(next.enrollment, components[col]!.id))?.focus()
  }

  const total = (s: SheetStudent) =>
    components.reduce((sum, c) => {
      const p = parse(textOf(key(s.enrollment, c.id)), c)
      return sum + (p.ok && p.entry?.status === 'present' ? (p.entry.marks ?? 0) : 0)
    }, 0)
  const full = components.reduce((n, c) => n + c.full_marks, 0)

  return (
    <div>
      <PageHeader
        backTo="/examinations/mark-sheets"
        title={`${sheet.subject_name} · ${sheet.section_name}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {sheet.exam_name}
            {sheet.date ? ` · sat ${formatDate(sheet.date)}` : ''}
            <SheetBadge status={sheet.status} />
          </span>
        }
        actions={
          office && (
            <>
              {sheet.status === 'submitted' && (
                <Button onClick={() => setDialog('verify')}>
                  <CheckCircle2 aria-hidden /> Verify
                </Button>
              )}
              {sheet.status !== 'open' && (
                <Button variant="outline" onClick={() => setDialog('sendBack')}>
                  <Undo2 aria-hidden /> Send back
                </Button>
              )}
            </>
          )
        }
      />

      {sheet.review_note && sheet.status === 'open' && <p className="mb-4 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm">Sent back by the exam office: “{sheet.review_note}”</p>}
      {locked && (
        <p className="mb-4 rounded-lg border border-info/20 bg-info-soft p-3 text-sm">
          {sheet.status === 'verified' ? `Verified ${sheet.verified_at ? formatDateTime(sheet.verified_at) : ''}.` : `Submitted ${sheet.submitted_at ? formatDateTime(sheet.submitted_at) : ''}.`}{' '}
          {office ? 'Changes now are corrections and need a reason.' : 'Ask the exam office to send it back if a mark needs changing.'}
        </p>
      )}

      {students.length === 0 ? (
        <EmptyState title="Nobody sits this paper" description="No student was in this class for the exam." />
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            Type the marks. <kbd className="rounded border px-1">Enter</kbd> or <kbd className="rounded border px-1">↓</kbd> goes to the next student. Use <b>AB</b> absent, <b>EX</b> exempt, <b>WH</b> withheld.
          </p>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm" aria-label={`Marks for ${sheet.subject_name}, ${sheet.section_name}`}>
              <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 min-w-48 bg-muted px-3 py-2">Student</th>
                  {components.map((c) => (
                    <th key={c.id} className="px-2 py-2 text-center">
                      {c.name}
                      <span className="block font-normal">
                        of {c.full_marks} · pass {c.pass_marks}
                      </span>
                    </th>
                  ))}
                  {components.length > 1 && <th className="px-3 py-2 text-right">Total of {full}</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((s, row) => (
                  <tr key={s.enrollment}>
                    <th scope="row" className="sticky left-0 bg-card px-3 py-1.5 text-left font-normal">
                      <span className="block font-medium">{s.student_name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{s.student_number}</span>
                      {s.admit_card === 'withheld' && <span className="ml-2 rounded border border-warning/25 bg-warning-soft px-1 text-[11px]">Admit card withheld</span>}
                    </th>
                    {components.map((c, col) => {
                      const k = key(s.enrollment, c.id)
                      const text = textOf(k)
                      const p = parse(text, c)
                      const below = p.ok && p.entry?.status === 'present' && (p.entry.marks ?? 0) < c.pass_marks
                      const problem = problems.get(k) ?? (!p.ok ? p.error : undefined)
                      const dirty = draft[k] != null && changed.some(([ck]) => ck === k)
                      return (
                        <td key={c.id} className="px-2 py-1.5 text-center">
                          <Input
                            ref={(el) => {
                              if (el) inputs.current.set(k, el)
                              else inputs.current.delete(k)
                            }}
                            value={text}
                            onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                            onKeyDown={(e) => onKey(e, row, col)}
                            onFocus={(e) => e.target.select()}
                            readOnly={!editable}
                            inputMode="decimal"
                            autoComplete="off"
                            aria-label={`${c.name} for ${s.student_name}`}
                            aria-invalid={problem ? true : undefined}
                            title={problem}
                            className={cn('mx-auto h-9 w-20 text-center tabular-nums', dirty && 'bg-primary/5', below && 'text-danger', problem && 'border-danger ring-1 ring-danger', !p.ok || (p.entry && p.entry.status !== 'present') ? 'font-medium uppercase' : '')}
                          />
                        </td>
                      )
                    })}
                    {components.length > 1 && <td className="px-3 py-1.5 text-right tabular-nums">{total(s)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editable && students.length > 0 && (
        <div className="sticky bottom-16 z-20 mt-4 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
          <FormError message={error} className="mb-2" />
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm text-muted-foreground">
              {changed.length ? `${changed.length} unsaved` : 'All saved'}
              {problems.size ? ` · ${problems.size} to fix` : ''}
              {missing ? ` · ${missing} empty` : ''}
            </p>
            <Button variant={locked ? 'default' : 'outline'} onClick={() => void onSave()} disabled={enter.isPending || changed.length === 0}>
              {enter.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />} {locked ? 'Save corrections' : 'Save'}
            </Button>
            {!locked && (
              <Button onClick={() => setDialog('submit')} disabled={enter.isPending}>
                <Send aria-hidden /> Submit
              </Button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={dialog === 'submit'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Submit these marks?"
        description={`They go to the exam office to verify. After this, only the office can change a mark.${missing ? ` ${missing} mark${missing === 1 ? ' is' : 's are'} still empty: fill them in first.` : ''}`}
        confirmLabel="Submit"
        onConfirm={async () => {
          await save()
          await submit.mutateAsync(id)
          toast.success('Marks submitted.')
        }}
      />
      <ConfirmDialog
        open={dialog === 'verify'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Verify these marks?"
        description="They’re checked and final; results can be published once every sheet is verified. You can still correct a single mark later, with a reason."
        confirmLabel="Verify"
        onConfirm={async () => {
          await verify.mutateAsync(id)
          toast.success('Marks verified.')
        }}
      />
      <FormDialog
        open={dialog === 'sendBack'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Send back to the teacher?"
        description="The sheet opens again for the teacher, with your note."
        submitLabel="Send back"
        schema={z.object({ reason: z.string().trim().min(1, 'Say what needs another look.').max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await sendBack.mutateAsync({ sid: id, reason: v.reason })
          toast.success('Sent back.')
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label="What needs another look" required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder="Practical marks missing for three students" />
          </FormField>
        )}
      </FormDialog>
      <FormDialog
        open={dialog === 'reason'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Save ${entries.length} correction${entries.length === 1 ? '' : 's'}?`}
        description="These marks were already submitted. The old values are kept with your reason."
        submitLabel="Save corrections"
        schema={z.object({ reason: z.string().trim().min(1, 'Give a reason.').max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await save(v.reason)
          toast.success('Corrections saved.')
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label="Reason" required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder="Re-totalled after a recheck request" />
          </FormField>
        )}
      </FormDialog>
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  )
}
