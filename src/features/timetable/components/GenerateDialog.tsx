import { AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { toast } from '@/hooks/useToast'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import { DEFAULT_DAYS, WEEKDAYS, type BellSchedule, type GenerateResult } from '../api/timetable.api'
import { useGenerate } from '../hooks/useTimetable'
import { tr } from '@/lib/i18n'

/**
 * Fills each teaching assignment up to its periods per week. Always previews
 * first (dry run); nothing is saved until "Save this timetable".
 */
export function GenerateDialog({ open, onOpenChange, schedule, academicYear, preselect }: { open: boolean; onOpenChange: (o: boolean) => void; schedule: BellSchedule | null; academicYear?: Id; preselect?: Id | null }) {
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: academicYear, campus: schedule?.campus, ordering: 'level' }, { enabled: open && schedule != null })
  const generate = useGenerate()
  const [sections, setSections] = useState<Id[]>([])
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS)
  const [plan, setPlan] = useState<GenerateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setSections(preselect ? [preselect] : [])
    setDays(DEFAULT_DAYS)
    setPlan(null)
    setError(null)
  }  // Fresh each time it opens (the parent opens it, so Radix's onOpenChange doesn't fire for that).
  useEffect(() => {
    if (open) reset()
    // reset only on opening
  }, [open])

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const run = async (dryRun: boolean) => {
    if (!schedule) return
    setError(null)
    try {
      const r = await generate.mutateAsync({ sections, schedule: schedule.id, days, dry_run: dryRun })
      if (dryRun) setPlan(r)
      else {
        toast.success(tr('{created} lessons added.', { created: r.created }))
        onOpenChange(false)
      }
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tr('Generate the timetable')}</DialogTitle>
          <DialogDescription>
            {tr('Places each subject as many times a week as its “periods a week”, avoiding clashes, in')} {schedule?.name ?? tr('the bell schedule')}{tr('. Existing lessons are kept. You see the plan before anything is saved.')}
          </DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        {!plan ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <p id="gen-classes" className="text-sm font-medium">{tr('Classes')}</p>
              <div role="group" aria-labelledby="gen-classes" className="grid max-h-52 gap-1.5 overflow-y-auto rounded-md border p-3 sm:grid-cols-3">
                {(classes.data?.results ?? []).map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={sections.includes(c.id)} onCheckedChange={() => setSections((s) => toggle(s, c.id))} />
                    {c.display_name}
                  </label>
                ))}
                {classes.data?.results.length === 0 && <p className="text-sm text-muted-foreground">{tr('No classes at this branch this year.')}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <p id="gen-days" className="text-sm font-medium">{tr('Teaching days')}</p>
              <div role="group" aria-labelledby="gen-days" className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    aria-pressed={days.includes(d.value)}
                    onClick={() => setDays((s) => toggle(s, d.value))}
                    className={cn('rounded-md border px-3 py-1 text-sm', days.includes(d.value) ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm">
              <span className="font-semibold">{plan.lessons.length}</span> {tr('lessons can be placed.')}
            </p>
            {plan.unplaced.length > 0 && (
              <div className="rounded-md border border-warning/30 bg-warning-soft p-3 text-sm">
                <p className="mb-1 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4 text-warning" aria-hidden /> {tr('Couldn’t fit everything')}
                </p>
                <ul className="list-inside list-disc text-xs">
                  {plan.unplaced.map((u) => (
                    <li key={u.teaching_assignment}>
                      {tr('{subject} for {section} ({teacher}): {missing} short. {reason}', { subject: u.subject, section: u.section, teacher: u.teacher, missing: u.missing, reason: u.reason })}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.lessons.length === 0 && plan.unplaced.length === 0 && (
              <p className="text-sm text-muted-foreground">{tr('Nothing to place: these classes already have every lesson their assignments ask for, or no assignment has “periods a week”.')}</p>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          {plan ? (
            <>
              <Button variant="outline" onClick={() => setPlan(null)}>
                {tr('Back')}
              </Button>
              <Button onClick={() => void run(false)} disabled={generate.isPending || plan.lessons.length === 0}>
                {generate.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {tr('Save this timetable')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {tr('Cancel')}
              </Button>
              <Button onClick={() => void run(true)} disabled={generate.isPending || sections.length === 0 || days.length === 0}>
                {generate.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
                {tr('Preview')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
