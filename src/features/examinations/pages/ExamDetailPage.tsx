import { CalendarCheck, Pencil, Send, Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAcademicYearOptions } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import { withProblems, type ResultCounts } from '../api/examinations.api'
import { AdmitCardsPanel } from '../components/AdmitCardsPanel'
import { ExamFormDialog } from '../components/ExamFormDialog'
import { ExamMarksPanel } from '../components/ExamMarksPanel'
import { ExamResultsPanel } from '../components/ExamResultsPanel'
import { PapersPanel } from '../components/PapersPanel'
import { resultCountsText } from '../components/ResultBits'
import { SeatingPanel } from '../components/SeatingPanel'
import { useExam, usePublishExam, useRemoveExam, useScheduleExam, useUnpublishExam, useUnscheduleExam } from '../hooks/useExaminations'
import { examDates, ExamStatusBadge } from './ExamsListPage'

const TABS = [
  { value: 'papers', label: 'Papers' },
  { value: 'seating', label: 'Rooms & seating' },
  { value: 'cards', label: 'Admit cards' },
  { value: 'marks', label: 'Marks' },
  { value: 'results', label: 'Results' },
] as const

const STEPS = ['draft', 'scheduled', 'published'] as const
const STEP_LABEL = { draft: 'Set up', scheduled: 'Scheduled', published: 'Published' }

/** One exam end to end: papers → schedule → seats and admit cards → marks → results → publish. */
export default function ExamDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const exam = useExam(Number.isFinite(id) ? id : null)
  const years = useAcademicYearOptions()
  const { isMultiBranch, branchName } = useBranches()
  const { can } = usePermissions()
  const schedule = useScheduleExam()
  const unschedule = useUnscheduleExam()
  const publish = usePublishExam()
  const unpublish = useUnpublishExam()
  const remove = useRemoveExam()
  const [dialog, setDialog] = useState<'edit' | 'schedule' | 'unschedule' | 'publish' | 'unpublish' | 'delete' | null>(null)
  const tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'papers'

  if (exam.isPending) return <PageLoader />
  if (exam.isError) return <ErrorState error={exam.error} onRetry={() => void exam.refetch()} />
  const e = exam.data
  const manage = can(PERMS.exams.manage)
  const canPublish = can(PERMS.exams.publish)
  const year = years.data?.find((y) => y.id === e.academic_year)?.name
  const close = (o: boolean) => !o && setDialog(null)

  return (
    <div>
      <PageHeader
        backTo="/examinations"
        title={e.name}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {[e.exam_type_name, e.program_name, year, isMultiBranch ? branchName(e.campus) : null, examDates(e)].filter(Boolean).join(' · ')}
            <ExamStatusBadge status={e.status} />
          </span>
        }
        actions={
          <>
            {e.status === 'draft' && manage && (
              <>
                <Button variant="outline" onClick={() => setDialog('edit')}>
                  <Pencil aria-hidden /> Edit
                </Button>
                <Button variant="outline" onClick={() => setDialog('delete')} aria-label="Delete exam">
                  <Trash2 aria-hidden />
                </Button>
                <Button onClick={() => setDialog('schedule')}>
                  <CalendarCheck aria-hidden /> Schedule
                </Button>
              </>
            )}
            {e.status === 'scheduled' && (
              <>
                {manage && (
                  <Button variant="outline" onClick={() => setDialog('unschedule')}>
                    <Undo2 aria-hidden /> Back to set up
                  </Button>
                )}
                {canPublish && (
                  <Button onClick={() => setDialog('publish')}>
                    <Send aria-hidden /> Publish results
                  </Button>
                )}
              </>
            )}
            {e.status === 'published' && canPublish && (
              <Button variant="outline" onClick={() => setDialog('unpublish')}>
                <Undo2 aria-hidden /> Unpublish
              </Button>
            )}
          </>
        }
      />

      <ol className="mb-5 flex flex-wrap items-center gap-2 text-xs" aria-label="Exam progress">
        {STEPS.map((s, i) => {
          const reached = STEPS.indexOf(e.status) >= i
          return (
            <li key={s} className="flex items-center gap-2">
              {i > 0 && <span className={cn('h-px w-6', reached ? 'bg-primary' : 'bg-border')} aria-hidden />}
              <span className={cn('rounded-full border px-2.5 py-0.5', e.status === s ? 'border-primary bg-primary text-primary-foreground' : reached ? 'border-primary text-primary' : 'text-muted-foreground')} aria-current={e.status === s ? 'step' : undefined}>
                {STEP_LABEL[s]}
              </span>
            </li>
          )
        })}
        {e.published_at && <li className="text-muted-foreground">Published {formatDateTime(e.published_at)}</li>}
      </ol>

      <div className="-mx-3 mb-5 overflow-x-auto border-b px-3 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Exam" className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setParams(t.value === 'papers' ? {} : { tab: t.value }, { replace: true })}
              className={cn('-mb-px border-b-2 px-3 py-2 text-sm', tab === t.value ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'papers' && <PapersPanel exam={e} />}
      {tab === 'seating' && <SeatingPanel exam={e} />}
      {tab === 'cards' && <AdmitCardsPanel exam={e} />}
      {tab === 'marks' && <ExamMarksPanel exam={e} />}
      {tab === 'results' && <ExamResultsPanel exam={e} />}

      <ExamFormDialog open={dialog === 'edit'} record={e} onOpenChange={close} />
      <ConfirmDialog
        open={dialog === 'schedule'}
        onOpenChange={close}
        title="Schedule this exam?"
        description="Every paper needs a date, a time and its marks. Clashes and holidays are refused. The exam is put on the academic calendar, and marks can be entered once each paper is sat."
        confirmLabel="Schedule"
        onConfirm={async () => {
          await schedule.mutateAsync(e.id).catch(withProblems)
          toast.success('Exam scheduled.')
        }}
      />
      <ConfirmDialog
        open={dialog === 'unschedule'}
        onOpenChange={close}
        title="Take the exam back to set up?"
        description="Only possible before any marks are entered. It comes off the academic calendar."
        confirmLabel="Back to set up"
        onConfirm={async () => {
          await unschedule.mutateAsync(e.id)
          toast.success('Exam is being set up again.')
        }}
      />
      <ConfirmDialog
        open={dialog === 'publish'}
        onOpenChange={close}
        title="Publish the results?"
        description="Every mark sheet must be verified and complete. Students and parents are notified and can see their results and report cards."
        confirmLabel="Publish"
        onConfirm={async () => {
          const r = (await publish.mutateAsync(e.id)) as { results: ResultCounts }
          toast.success(`Results published: ${resultCountsText(r.results)}.`)
        }}
      />
      <FormDialog
        open={dialog === 'unpublish'}
        onOpenChange={close}
        title="Withdraw the published results?"
        description="Students and parents stop seeing them until they’re published again."
        submitLabel="Unpublish"
        schema={z.object({ reason: z.string().trim().min(1, 'Say why.').max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await unpublish.mutateAsync({ id: e.id, reason: v.reason })
          toast.success('Results withdrawn.')
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label="Reason" required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder="A marking error in Science…" />
          </FormField>
        )}
      </FormDialog>
      <DeleteDialog
        open={dialog === 'delete'}
        onOpenChange={close}
        subject={`the exam “${e.name}”`}
        description="Its papers and rooms go with it."
        onConfirm={async () => {
          await remove.mutateAsync(e.id)
          toast.success('Exam deleted.')
          navigate('/examinations')
        }}
      />
    </div>
  )
}
