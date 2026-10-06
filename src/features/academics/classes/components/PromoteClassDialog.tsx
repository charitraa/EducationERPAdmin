import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { studentKeys } from '@/features/students/api/students.api'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { tr } from '@/lib/i18n'
import { apiClient } from '@/shared/api/client'
import { toApiError } from '@/shared/api/errors'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { classKeys, type SchoolClass, type SectionStudent } from '../api/classes.api'
import { useClasses, useSectionStudents } from '../hooks/useClasses'

interface PromoteBody {
  to_section: number
  exclude: number[]
  on_date?: string
  reason: string
  allow_over_capacity: boolean
}

/** One line per student the backend refused, from a 409 `promotion_failed`. */
type Refusal = { student: number; student_number: string; message: string }

/**
 * End-of-year promotion (or merging two classes): everyone in one class moves
 * to another, except those held back. All or nothing on the backend, so a
 * refusal lists each student who can't move and nobody has moved.
 */
export function PromoteClassDialog({ source, onClose }: { source: SchoolClass | null; onClose: () => void }) {
  const qc = useQueryClient()
  const open = source !== null
  const ids = { overCapacity: useId() }
  const students = useSectionStudents(source?.id ?? null)
  const classes = useClasses({ ...PICKER_PARAMS, campus: source?.campus, ordering: 'level' }, { enabled: open })
  const [target, setTarget] = useState('')
  const [held, setHeld] = useState<Set<number>>(new Set())
  const [onDate, setOnDate] = useState('')
  const [reason, setReason] = useState('')
  const [overCapacity, setOverCapacity] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refusals, setRefusals] = useState<Refusal[]>([])

  useEffect(() => {
    if (open) {
      setTarget('')
      setHeld(new Set())
      setOnDate('')
      setReason(tr('Promotion'))
      setOverCapacity(false)
      setError(null)
      setRefusals([])
    }
  }, [open, source?.id])

  // Other classes at the branch: a later year's first (where a class is promoted to), then the next level up.
  const targets = useMemo(() => {
    const others = (classes.data?.results ?? []).filter((c) => source && c.id !== source.id)
    const rank = (c: SchoolClass) => (c.academic_year === source?.academic_year ? 1 : 0)
    return others.sort((a, b) => rank(a) - rank(b) || b.academic_year_name.localeCompare(a.academic_year_name) || a.level - b.level || a.display_name.localeCompare(b.display_name))
  }, [classes.data, source])
  const to = targets.find((c) => String(c.id) === target)
  const moving = (students.data ?? []).filter((s) => !held.has(s.id))
  const overfills = to?.capacity != null && to.student_count + moving.length > to.capacity

  const promote = useMutation({
    mutationFn: (body: PromoteBody) => apiClient.post<SectionStudent[]>(`/sections/${source!.id}/promote/`, body).then((r) => r.data),
    meta: { silent: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: classKeys.all })
      void qc.invalidateQueries({ queryKey: studentKeys.all })
    },
  })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setRefusals([])
    if (!to) return setError(tr('Choose the class they move to.'))
    if (!moving.length) return setError(tr('Everyone is held back, so nobody would move.'))
    try {
      const moved = await promote.mutateAsync({
        to_section: to.id,
        exclude: [...held],
        on_date: onDate || undefined,
        reason: reason.trim(),
        allow_over_capacity: overCapacity,
      })
      toast.success(
        onDate
          ? tr('{count} students will move to {name} on {date}.', { count: moved.length, name: to.display_name, date: formatDate(onDate) })
          : tr('{count} students moved to {name}.', { count: moved.length, name: to.display_name }),
      )
      onClose()
    } catch (err) {
      const apiErr = toApiError(err)
      const details = apiErr.details as { students?: Refusal[] } | null
      if (apiErr.code === 'promotion_failed' && details?.students) setRefusals(details.students)
      setError(apiErr.status === 400 && apiErr.fieldErrors ? Object.values(apiErr.fieldErrors).join(' ') || errorMessage(apiErr) : errorMessage(apiErr))
    }
  }

  const nameOf = (id: number) => students.data?.find((s) => s.id === id)?.full_name
  const toggle = (id: number) =>
    setHeld((h) => {
      const next = new Set(h)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !promote.isPending && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tr('Promote {name}', { name: source?.display_name ?? '' })}</DialogTitle>
          <DialogDescription>
            {tr('Move the whole class to another class, e.g. into next year’s grade. Untick anyone who is held back. If anyone can’t move, nobody is moved.')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormError message={error} />
          {refusals.length > 0 && (
            <ul className="grid gap-1 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm" aria-label={tr('Students who can’t move')}>
              {refusals.map((r) => (
                <li key={r.student}>
                  <span className="font-medium">{nameOf(r.student) ?? r.student_number}</span>
                  <span className="font-mono text-xs text-muted-foreground"> {r.student_number}</span>: {r.message}
                </li>
              ))}
            </ul>
          )}
          <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-0.5 py-0.5">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <FormField label={tr('Move to')} required>
                <SelectControl
                  value={target}
                  onChange={setTarget}
                  loading={classes.isPending}
                  placeholder={tr('Choose a class…')}
                  options={targets.map((c) => ({ value: String(c.id), label: `${c.display_name} · ${c.academic_year_name}` }))}
                />
              </FormField>
              {to && (
                <p className="flex items-center gap-1.5 pb-2 text-sm text-muted-foreground">
                  {source?.display_name} <ArrowRight className="h-3.5 w-3.5" aria-hidden /> {to.display_name}
                  <span className="tabular-nums">
                    {' '}
                    {to.capacity != null
                      ? tr('({count} of {capacity} places taken)', { count: to.student_count, capacity: to.capacity })
                      : tr('({count} students now)', { count: to.student_count })}
                  </span>
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('Moves on')} description={tr('Leave empty for today. A later date schedules the move.')}>
                <DatePicker value={onDate} onChange={setOnDate} />
              </FormField>
              <FormField label={tr('Reason')}>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} />
              </FormField>
            </div>
            <fieldset className="rounded-md border">
              <legend className="sr-only">{tr('Students')}</legend>
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm">
                <span className="font-medium">
                  {tr('{moving} of {total} move', { moving: moving.length, total: students.data?.length ?? 0 })}
                </span>
                {held.size > 0 && <span className="text-muted-foreground">{tr('{count} held back', { count: held.size })}</span>}
              </div>
              {students.isPending ? (
                <p className="p-3 text-sm text-muted-foreground">{tr('Loading…')}</p>
              ) : students.isError ? (
                <p className="p-3 text-sm text-danger">{errorMessage(students.error)}</p>
              ) : students.data.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">{tr('There are no students in this class to move.')}</p>
              ) : (
                <ul className="divide-y">
                  {students.data.map((s) => {
                    const id = `promote-${s.id}`
                    return (
                      <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                        <Checkbox id={id} checked={!held.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                        <Label htmlFor={id} className="flex flex-1 flex-wrap items-baseline gap-x-2 font-normal">
                          <span className={held.has(s.id) ? 'text-muted-foreground line-through' : 'font-medium'}>{s.full_name}</span>
                          <span className="font-mono text-xs text-muted-foreground">{s.student_number}</span>
                          {held.has(s.id) && <span className="text-xs text-muted-foreground">{tr('stays in {name}', { name: source?.display_name ?? '' })}</span>}
                        </Label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </fieldset>
            {overfills && (
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <div className="grid gap-2">
                  <p>{tr('{name} holds {capacity}; this would make it {count}.', { name: to.display_name, capacity: to.capacity ?? 0, count: to.student_count + moving.length })}</p>
                  <div className="flex items-center gap-2">
                    <Checkbox id={ids.overCapacity} checked={overCapacity} onCheckedChange={(v) => setOverCapacity(v === true)} />
                    <Label htmlFor={ids.overCapacity} className="font-normal">
                      {tr('Move them anyway, over capacity')}
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={promote.isPending}>
              {tr('Cancel')}
            </Button>
            <Button type="submit" disabled={promote.isPending || !students.data?.length}>
              {promote.isPending && <Loader2 className="animate-spin" aria-hidden />}
              {tr('Move {count} students', { count: moving.length })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
