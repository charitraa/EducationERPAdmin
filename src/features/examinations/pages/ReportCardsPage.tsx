import { FileText, Printer } from 'lucide-react'
import { useId } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { ReportCardView } from '../components/ReportCardView'
import { useExamOptions, usePlans, useReportCards } from '../hooks/useExaminations'
import { tr } from '@/lib/i18n'

/** Report cards for a whole class (or one student) from one exam or term result, ready to print. */
export default function ReportCardsPage() {
  const [params, setParams] = useSearchParams()
  const ids = { source: useId(), section: useId() }
  const exam = params.get('exam') ?? ''
  const plan = params.get('plan') ?? ''
  const section = params.get('section') ?? ''
  const student = params.get('student') ?? ''
  const exams = useExamOptions({ status: 'published' })
  const allExams = useExamOptions()
  const plans = usePlans(PICKER_PARAMS)
  const chosenExam = allExams.data?.find((e) => String(e.id) === exam)
  const chosenPlan = plans.data?.results.find((p) => String(p.id) === plan)
  const source = chosenExam ?? chosenPlan
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: source?.academic_year, program: source?.program, campus: source?.campus, ordering: 'level' })
  const ready = Boolean((exam || plan) && (section || student))
  const cards = useReportCards({ exam: exam ? Number(exam) : undefined, plan: plan ? Number(plan) : undefined, section: section ? Number(section) : undefined, student: student ? Number(student) : undefined }, ready)

  const sourceValue = exam ? `exam:${exam}` : plan ? `plan:${plan}` : ''
  const sourceOptions = [
    ...(exams.data ?? []).map((e) => ({ value: `exam:${e.id}`, label: e.name })),
    ...(plans.data?.results ?? []).filter((p) => p.status === 'published').map((p) => ({ value: `plan:${p.id}`, label: tr('{name} (term result)', { name: p.name }) })),
  ]
  // Keep an unpublished exam opened from its Results tab choosable.
  if (chosenExam && !sourceOptions.some((o) => o.value === sourceValue)) sourceOptions.unshift({ value: sourceValue, label: tr('{name} (not published)', { name: chosenExam.name }) })

  const setSource = (v: string) => {
    const [kind, id] = v.split(':')
    setParams(kind && id ? { [kind]: id } : {}, { replace: true })
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <div className="grid min-w-64 gap-1.5">
          <Label htmlFor={ids.source}>{tr('Exam or term result')}</Label>
          <SelectControl id={ids.source} value={sourceValue} onChange={setSource} options={sourceOptions} placeholder={tr('Choose…')} />
        </div>
        <div className="grid min-w-48 gap-1.5">
          <Label htmlFor={ids.section}>{tr('Class')}</Label>
          <SelectControl
            id={ids.section}
            value={section}
            onChange={(v) => setParams((prev) => {
              const next = new URLSearchParams(prev)
              next.delete('student')
              if (v) next.set('section', v)
              else next.delete('section')
              return next
            }, { replace: true })}
            disabled={!source}
            options={(classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.display_name }))}
          />
        </div>
        {cards.data && cards.data.length > 0 && (
          <Button variant="outline" className="ml-auto" onClick={() => window.print()}>
            <Printer aria-hidden /> {tr('Print')} {cards.data.length === 1 ? '' : tr('all {count}', { count: cards.data.length })}
          </Button>
        )}
      </div>
      {!ready ? (
        <EmptyState title={tr('Choose an exam and a class')} description={tr('Report cards come from published results. An exam’s Results tab links to single students too.')} icon={FileText} />
      ) : cards.isPending ? (
        <TableSkeleton rows={6} columns={6} />
      ) : cards.isError ? (
        <ErrorState error={cards.error} onRetry={() => void cards.refetch()} />
      ) : cards.data.length === 0 ? (
        <EmptyState title={tr('No results for this choice')} description={tr('Work out (or publish) the results first.')} />
      ) : (
        <div className="grid gap-6">
          {cards.data.map((c) => (
            <ReportCardView key={c.result_id} card={c} />
          ))}
        </div>
      )}
    </>
  )
}
