import { ArrowRight, CheckCircle2, Circle, MinusCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSetupProgress } from '../hooks/useSetupProgress'
import { tr } from '@/lib/i18n'

/** Dashboard card shown until setup is done (or dismissed). */
export function SetupChecklist() {
  const setup = useSetupProgress()
  if (setup.isLoading || setup.dismissed || setup.isComplete) return null
  const pct = Math.round((setup.completed / setup.total) * 100)

  return (
    <section aria-labelledby="setup-title" className="rounded-lg border border-primary/25 bg-card">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div>
          <h2 id="setup-title" className="font-semibold">
            {tr('Complete your school setup')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tr('{completed} of {total} done. Each step can be skipped and finished later.', { completed: setup.completed, total: setup.total })}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={setup.dismiss} aria-label={tr('Hide setup checklist')}>
          <X />
        </Button>
      </div>
      <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={tr('Setup progress')}>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="grid gap-x-6 gap-y-1.5 p-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        {setup.steps.map((s) => {
          const Icon = s.done ? CheckCircle2 : s.skipped ? MinusCircle : Circle
          return (
            <li key={s.id} className={cn('flex items-center gap-2', s.done ? 'text-foreground' : 'text-muted-foreground')}>
              <Icon className={cn('h-4 w-4 shrink-0', s.done && 'text-success')} aria-hidden />
              <span className={cn(s.done && 'line-through decoration-muted-foreground/40')}>{s.title}</span>
              <span className="sr-only">{s.done ? tr('(done)') : s.skipped ? tr('(skipped)') : tr('(to do)')}</span>
            </li>
          )
        })}
      </ul>
      {setup.nextStep && (
        <div className="border-t px-4 py-3">
          <Button asChild size="sm">
            <Link to={`/settings/setup?step=${setup.nextStep.id}`}>
              {tr('Continue setup: {title}', { title: setup.nextStep.title })} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      )}
    </section>
  )
}
