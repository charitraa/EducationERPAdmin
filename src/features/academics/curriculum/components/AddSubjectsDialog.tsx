import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/useToast'
import { errorMessage } from '@/lib/errors'
import type { Id } from '@/shared/types/api'
import type { Subject } from '../../subjects/api/subjects.api'
import { useAddCurriculumSubjects } from '../hooks/useCurriculum'
import { tr } from '@/lib/i18n'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  program: Id
  level: number
  levelName: string
  /** Subjects not yet taken at this level. */
  available: Subject[]
}

export function AddSubjectsDialog({ open, onOpenChange, program, level, levelName, available }: Props) {
  const [chosen, setChosen] = useState<Set<Id>>(new Set())
  const [elective, setElective] = useState(false)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const add = useAddCurriculumSubjects()

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? available.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) : available
  }, [available, filter])

  const toggle = (id: Id) =>
    setChosen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const close = (o: boolean) => {
    if (!o) {
      setChosen(new Set())
      setElective(false)
      setFilter('')
      setError(null)
    }
    onOpenChange(o)
  }

  const submit = async () => {
    setError(null)
    try {
      await add.mutateAsync({ program, level, subjects: [...chosen], isElective: elective })
      toast.success(tr('{size} subject{value} added to {levelName}.', { size: chosen.size, value: chosen.size === 1 ? '' : 's', levelName }))
      close(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tr('Add subjects to {levelName}', { levelName })}</DialogTitle>
          <DialogDescription>{tr('Pick the subjects this level takes.')}</DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={tr('Filter subjects…')} aria-label={tr('Filter subjects')} />
        <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
          {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{tr('No more subjects to add.')}</li>}
          {shown.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                <Checkbox checked={chosen.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{s.code}</span>
                <span className="flex-1">{s.name}</span>
              </label>
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={elective} onCheckedChange={setElective} />
          {tr('Students choose these (electives)')}
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            {tr('Cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={chosen.size === 0 || add.isPending}>
            {add.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {tr('Add {value} subject{value2}', { value: chosen.size > 0 ? chosen.size : '', value2: chosen.size === 1 ? '' : 's' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
