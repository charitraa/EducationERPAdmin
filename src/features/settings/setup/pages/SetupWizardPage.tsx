import { ArrowLeft, ArrowRight, CheckCircle2, Circle, MinusCircle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ClassesStep } from '../components/steps/ClassesStep'
import { ModulesStep } from '../components/steps/ModulesStep'
import { PeopleStep } from '../components/steps/PeopleStep'
import { ProgramsStep } from '../components/steps/ProgramsStep'
import { SchoolStep } from '../components/steps/SchoolStep'
import { YearStep } from '../components/steps/YearStep'
import { useSetupProgress, type SetupStepId } from '../hooks/useSetupProgress'
import { tr } from '@/lib/i18n'

/**
 * First-login setup: seven steps, each skippable, resumable from the
 * dashboard checklist, and done as soon as the data exists.
 */
export default function SetupWizardPage() {
  const setup = useSetupProgress()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const ids = setup.steps.map((s) => s.id)
  const currentId = (ids.includes(params.get('step') as SetupStepId) ? params.get('step') : (setup.nextStep?.id ?? 'school')) as SetupStepId
  const index = ids.indexOf(currentId)
  const step = setup.steps[index]!
  const isLast = index === ids.length - 1

  const go = (id: SetupStepId) => setParams({ step: id }, { replace: false })
  const next = () => {
    if (isLast) {
      setup.markModulesReviewed()
      navigate('/')
    } else go(ids[index + 1]!)
  }
  const skip = () => {
    setup.skip(currentId)
    next()
  }

  return (
    <>
      <PageHeader title={tr('Set up your school')} description={tr('{completed} of {total} steps done. Skip anything and come back later.', { completed: setup.completed, total: setup.total })} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label={tr('Setup steps')}>
          <ol className="relative flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {setup.steps.map((s, i) => {
              const Icon = s.done ? CheckCircle2 : s.skipped ? MinusCircle : Circle
              const active = s.id === currentId
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => go(s.id)}
                    aria-current={active ? 'step' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', s.done && 'text-success')} aria-hidden />
                    <span className="whitespace-nowrap">
                      <span className="tabular-nums">{i + 1}.</span> {s.title}
                    </span>
                    <span className="sr-only">{s.done ? tr('(done)') : s.skipped ? tr('(skipped)') : ''}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
        <section aria-labelledby="step-title" className="rounded-lg border bg-card">
          <header className="border-b p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tr('Step {value} of {count}', { value: index + 1, count: ids.length })}
              {step.done && <span className="ml-2 text-success">{'· ' + tr('Done')}</span>}
              {step.skipped && <span className="ml-2">{'· ' + tr('Skipped')}</span>}
            </p>
            <h2 id="step-title" className="mt-0.5 text-lg font-semibold">
              {step.title}
            </h2>
            <p className="text-sm text-muted-foreground">{step.summary}</p>
          </header>
          <div className="p-4 sm:p-5">
            {currentId === 'school' && <SchoolStep onDone={() => go('year')} />}
            {currentId === 'year' && <YearStep />}
            {currentId === 'programs' && <ProgramsStep />}
            {currentId === 'classes' && <ClassesStep />}
            {currentId === 'staff' && <PeopleStep kind="staff" />}
            {currentId === 'students' && <PeopleStep kind="students" />}
            {currentId === 'modules' && <ModulesStep />}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t p-4 sm:px-5">
            <Button variant="ghost" onClick={() => go(ids[index - 1]!)} disabled={index === 0}>
              <ArrowLeft aria-hidden /> {tr('Back')}
            </Button>
            <div className="flex gap-2">
              {!step.done && !isLast && (
                <Button variant="outline" onClick={skip}>
                  {tr('Skip for now')}
                </Button>
              )}
              {currentId !== 'school' && (
                <Button onClick={next}>
                  {isLast ? tr('Finish') : tr('Continue')} <ArrowRight aria-hidden />
                </Button>
              )}
            </div>
          </footer>
        </section>
      </div>
    </>
  )
}
