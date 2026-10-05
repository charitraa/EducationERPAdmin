import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SectionHeader } from '@/components/common/SectionHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { errorMessage } from '@/lib/errors'
import { enumLabel } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { Exam, MarkSheet } from '../api/examinations.api'
import { useOpenSheet, useReadiness } from '../hooks/useExaminations'
import { tr } from '@/lib/i18n'

export function SheetBadge({ status }: { status: MarkSheet['status'] | null }) {
  if (status == null) return <StatusBadge status="pending" label={tr('Not started')} />
  return <StatusBadge status={status === 'open' ? 'in_progress' : status} label={enumLabel('MarkSheetStatusEnum', status)} />
}

/** Every paper × class that needs marks, and how far each has got: what stands between the exam and publishing. */
export function ExamMarksPanel({ exam }: { exam: Exam }) {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const readiness = useReadiness(exam.id, exam.status !== 'draft')
  const open = useOpenSheet()
  const [opening, setOpening] = useState<string | null>(null)
  const canOpen = can(PERMS.exams.mark)

  if (exam.status === 'draft') return <EmptyState title={tr('Schedule the exam first')} description={tr('Marks are entered per paper and class once the exam is scheduled and the paper has been sat.')} />
  if (readiness.isPending) return <TableSkeleton rows={4} columns={4} />
  if (readiness.isError) return <ErrorState error={readiness.error} onRetry={() => void readiness.refetch()} />
  const r = readiness.data
  const done = r.expected_sheets - r.not_started.length - r.not_verified.length

  const start = async (exam_subject: number, section: number) => {
    setOpening(`${exam_subject}-${section}`)
    try {
      const sheet = await open.mutateAsync({ exam_subject, section })
      navigate(`/examinations/mark-sheets/${sheet.id}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setOpening(null)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">{tr('Verified mark sheets')}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {done} <span className="text-base font-normal text-muted-foreground">{tr('of {expected_sheets}', { expected_sheets: r.expected_sheets })}</span>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={r.expected_sheets} aria-valuenow={done} aria-label={tr('Verified mark sheets')}>
          <div className="h-full bg-success" style={{ width: `${r.expected_sheets ? (100 * done) / r.expected_sheets : 0}%` }} />
        </div>
        {r.ready && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> {tr('Every mark sheet is verified: results can be published.')}
          </p>
        )}
      </div>
      {r.not_verified.length > 0 && (
        <section>
          <SectionHeader title={tr('Entered, not verified')} description={tr('Open one to check it and verify, or send it back to the teacher.')} />
          <ul className="divide-y rounded-lg border bg-card">
            {r.not_verified.map((s) => (
              <li key={s.sheet} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <Link to={`/examinations/mark-sheets/${s.sheet}`} className="flex-1 font-medium hover:underline">
                  {s.subject} <span className="font-normal text-muted-foreground">· {s.section_name}</span>
                </Link>
                <SheetBadge status={s.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {r.not_started.length > 0 && (
        <section>
          <SectionHeader title={tr('Not started')} description={tr('A sheet opens once its paper has been sat.')} />
          <ul className="divide-y rounded-lg border bg-card">
            {r.not_started.map((s) => {
              const key = `${s.exam_subject}-${s.section}`
              return (
                <li key={key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 font-medium">
                    {s.subject} <span className="font-normal text-muted-foreground">· {s.section_name}</span>
                  </span>
                  <SheetBadge status={null} />
                  {canOpen && (
                    <Button size="sm" variant="outline" onClick={() => void start(s.exam_subject, s.section)} disabled={opening != null}>
                      {opening === key && <Loader2 className="animate-spin" aria-hidden />} {tr('Enter marks')}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
